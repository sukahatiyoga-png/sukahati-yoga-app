import { Router } from "express";
import { db } from "../db";
import { genReference, genQrToken, formatMoney } from "../domain/enums";
import { computeDiscount, recomputeAmountPaid } from "../domain/pricing";
import { dayParts, timeParts, initials } from "../domain/format";
import { notifyOwner, notifyCustomer } from "../domain/mailer";

export const bookingsRouter = Router();

const FULL_INCLUDE = {
  user: true,
  package: true,
  session: { include: { teacher: true, room: true } },
  retreat: true,
  event: true,
  coupon: true,
  addons: { include: { addon: true } },
  payments: true,
} as const;

function isStaff(req: { userRole?: string }): boolean {
  return req.userRole === "owner" || req.userRole === "desk";
}

function effectiveDate(b: any): Date {
  return b.session?.startsAt ?? b.retreat?.startsOn ?? b.event?.startsAt ?? b.createdAt;
}

function customerMeta(b: any): string {
  if (b.session) {
    const { time, ampm } = timeParts(b.session.startsAt);
    return `${time} ${ampm} · ${b.session.teacher.name.split(" ")[0]} · ${b.session.room.name}`;
  }
  if (b.retreat) {
    return `Check-in ${b.retreat.checkInAt} · shared room${b.specialRequests ? " · " + b.specialRequests : ""}`;
  }
  if (b.event) {
    const { time, ampm } = timeParts(b.event.startsAt);
    return `${new Date(b.event.startsAt).toDateString()} · ${time} ${ampm}`;
  }
  return b.package.name;
}

function serializeCustomer(b: any, reviewedBookingIds?: Set<string>) {
  const { mon, num } = dayParts(effectiveDate(b));
  const balance = Math.max(0, b.totalMinor - b.amountPaidMinor);
  return {
    id: b.id, mon, day: num, title: b.session?.title || b.package.name, meta: customerMeta(b),
    status: b.status, confirmed: b.status === "confirmed", pending: b.status === "pending",
    attended: b.status === "attended", cancelled: b.status === "cancelled",
    hasReview: reviewedBookingIds ? reviewedBookingIds.has(b.id) : false,
    balanceMinor: balance || null, ref: b.reference, qrToken: b.qrToken,
    packageName: b.package.name, createdAt: b.createdAt.toISOString(),
  };
}

function serializeAdmin(b: any) {
  const balance = Math.max(0, b.totalMinor - b.amountPaidMinor);
  const meta = b.session
    ? `${new Date(b.session.startsAt).toDateString()} · ${timeParts(b.session.startsAt).time} ${timeParts(b.session.startsAt).ampm} · ${b.guestCount} guest${b.guestCount > 1 ? "s" : ""}`
    : b.retreat
      ? `${b.retreat.startsOn.toDateString().slice(4, 10)}–${b.retreat.endsOn.getDate()} · retreat · shared room`
      : b.event
        ? `${new Date(b.event.startsAt).toDateString()} · event · ${b.guestCount} guest${b.guestCount > 1 ? "s" : ""}`
        : `${b.guestCount} guest(s)`;
  return {
    id: b.id, name: b.user.fullName, initials: initials(b.user.fullName), meta,
    pkg: b.package.name, amountMinor: b.amountPaidMinor > 0 ? b.amountPaidMinor : b.totalMinor,
    paid: b.amountPaidMinor >= b.totalMinor && b.totalMinor > 0, unpaid: balance > 0,
    status: b.status, isPending: b.status === "pending", isConfirmed: b.status === "confirmed",
    createdAt: b.createdAt.toISOString(),
  };
}

// Live pricing preview for step 3 of the booking flow — no writes, so the
// booking form can show real subtotal/discount/total without duplicating
// the pricing rules client-side.
bookingsRouter.post("/quote", async (req, res) => {
  const { packageId, guestCount, addonIds, couponCode } = req.body || {};
  const pkg = await db.package.findUnique({ where: { id: packageId } });
  if (!pkg) return res.status(404).json({ error: "Package not found" });
  const guests = Math.max(1, Number(guestCount) || 1);
  const addons = addonIds?.length ? await db.addon.findMany({ where: { id: { in: addonIds } } }) : [];
  let coupon = null;
  let couponMessage = "";
  if (couponCode) {
    coupon = await db.coupon.findFirst({ where: { code: String(couponCode).toUpperCase(), isActive: true, expiresAt: { gte: new Date() } } });
    couponMessage = coupon ? `${String(couponCode).toUpperCase()} applied · ${coupon.discountType === "percent" ? coupon.discountValue + "% off" : "discount applied"}` : "That code is not valid";
  }
  const base = pkg.priceMinor * guests;
  const addonsTotal = addons.reduce((n, a) => n + a.priceMinor, 0) * guests;
  const subtotal = base + addonsTotal;
  const discountMinor = computeDiscount(subtotal, coupon);
  const totalMinor = subtotal - discountMinor;
  res.json({
    subtotalMinor: base, addonsTotalMinor: addonsTotal, discountMinor, totalMinor,
    depositMinor: Math.round(totalMinor / 2), couponValid: !!coupon, couponMessage,
    cancelLabel: pkg.cancelLabel,
  });
});

bookingsRouter.get("/", async (req, res) => {
  if (!isStaff(req)) {
    const userId = req.userId!;
    const bookings = await db.booking.findMany({ where: { userId }, include: FULL_INCLUDE, orderBy: { createdAt: "desc" } });
    const now = new Date();
    const upcoming = bookings.filter((b) => ["pending", "confirmed"].includes(b.status) && effectiveDate(b) >= now);
    const past = bookings.filter((b) => !upcoming.includes(b));
    upcoming.sort((a, b) => effectiveDate(a).getTime() - effectiveDate(b).getTime());
    past.sort((a, b) => effectiveDate(b).getTime() - effectiveDate(a).getTime());
    const reviews = await db.review.findMany({ where: { userId }, select: { bookingId: true } });
    const reviewedBookingIds = new Set(reviews.map((r) => r.bookingId));
    return res.json({ upcoming: upcoming.map((b) => serializeCustomer(b, reviewedBookingIds)), past: past.map((b) => serializeCustomer(b, reviewedBookingIds)) });
  }

  const { status, search } = req.query as Record<string, string | undefined>;
  let bookings = await db.booking.findMany({ include: FULL_INCLUDE, orderBy: { createdAt: "desc" } });
  if (status && status !== "All") {
    if (status === "Unpaid") bookings = bookings.filter((b) => b.totalMinor - b.amountPaidMinor > 0);
    else bookings = bookings.filter((b) => b.status === status.toLowerCase());
  }
  if (search) {
    const needle = search.toLowerCase();
    bookings = bookings.filter((b) => b.user.fullName.toLowerCase().includes(needle));
  }
  res.json(bookings.map(serializeAdmin));
});

// Staff-only lookup used by the admin camera scanner: decode a QR code to
// its token client-side, then resolve it here to a bookable check-in card.
bookingsRouter.get("/by-qr/:token", async (req, res) => {
  if (!isStaff(req)) return res.status(403).json({ error: "Staff access required" });
  const b = await db.booking.findUnique({ where: { qrToken: req.params.token }, include: FULL_INCLUDE });
  if (!b) return res.status(404).json({ error: "No booking matches this QR code" });
  res.json({
    id: b.id, reference: b.reference, name: b.user.fullName, initials: initials(b.user.fullName),
    title: b.session?.title || b.package.name, meta: customerMeta(b), status: b.status,
    checkedIn: !!b.checkedInAt, cancelled: b.status === "cancelled",
  });
});

bookingsRouter.get("/:id", async (req, res) => {
  const b = await db.booking.findUnique({ where: { id: req.params.id }, include: FULL_INCLUDE });
  if (!b) return res.status(404).json({ error: "Booking not found" });
  if (b.userId !== req.userId && !isStaff(req)) return res.status(403).json({ error: "Not allowed" });
  res.json({ ...serializeCustomer(b), addons: b.addons.map((a: any) => ({ name: a.addon.name, quantity: a.quantity })) });
});

// ── Create booking ──────────────────────────────────────────────────────
// Enforces "no double booking": capacity is re-checked inside the same
// transaction that increments seatsTaken, so two concurrent requests can't
// both squeeze into the last seat.
bookingsRouter.post("/", async (req, res) => {
  const b = req.body || {};
  const userId = req.userId!;
  const { packageId, sessionId, retreatId, eventId, guestCount, level, specialRequests, addonIds, couponCode, payMode, method } = b;
  if (!packageId) return res.status(400).json({ error: "packageId is required" });
  const guests = Math.max(1, Number(guestCount) || 1);

  try {
    const result = await db.$transaction(async (tx) => {
      const pkg = await tx.package.findUnique({ where: { id: packageId } });
      if (!pkg) throw new Error("Package not found");

      let session = null;
      if (sessionId) {
        session = await tx.session.findUnique({ where: { id: sessionId } });
        if (!session) throw new Error("Session not found");
        if (session.status === "cancelled" || session.status === "blocked") {
          throw new Error("This class is no longer available");
        }
        if (session.seatsTaken + guests > session.capacity) {
          throw new Error("This class is fully booked — join the waitlist instead");
        }
      }

      let retreat = null;
      if (retreatId) {
        retreat = await tx.retreat.findUnique({ where: { id: retreatId } });
        if (!retreat) throw new Error("Retreat not found");
        if (retreat.placesTaken + guests > retreat.totalPlaces) {
          throw new Error("This retreat is fully booked — join the waitlist instead");
        }
      }

      let event = null;
      if (eventId) {
        event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new Error("Event not found");
        if (event.placesTaken + guests > event.totalPlaces) {
          throw new Error("This event is fully booked — join the waitlist instead");
        }
      }

      const addons = addonIds?.length ? await tx.addon.findMany({ where: { id: { in: addonIds } } }) : [];
      const coupon = couponCode
        ? await tx.coupon.findFirst({ where: { code: String(couponCode).toUpperCase(), isActive: true } })
        : null;

      const base = pkg.priceMinor * guests;
      const addonsTotal = addons.reduce((n, a) => n + a.priceMinor, 0) * guests;
      const subtotal = base + addonsTotal;
      const discount = computeDiscount(subtotal, coupon);
      const total = subtotal - discount;
      const deposit = Math.round(total / 2);
      const amountPaid = payMode === "deposit" ? deposit : payMode === "studio" ? 0 : total;

      const status = pkg.kind === "private" || pkg.kind === "online" ? "pending" : "confirmed";

      const booking = await tx.booking.create({
        data: {
          reference: genReference(), userId, packageId, sessionId: session?.id ?? null, retreatId: retreat?.id ?? null, eventId: event?.id ?? null,
          guestCount: guests, level: level || "Beginner", specialRequests: specialRequests || "",
          status, subtotalMinor: subtotal, discountMinor: discount, totalMinor: total,
          currency: pkg.currency, qrToken: genQrToken(), couponId: coupon?.id ?? null,
        },
      });

      for (const a of addons) {
        await tx.bookingAddon.create({ data: { bookingId: booking.id, addonId: a.id, quantity: guests, unitPriceMinor: a.priceMinor } });
      }

      if (amountPaid > 0) {
        await tx.payment.create({
          data: {
            bookingId: booking.id, kind: payMode === "deposit" ? "deposit" : "full",
            method: method || "card", amountMinor: amountPaid, status: "paid", paidAt: new Date(), currency: pkg.currency,
          },
        });
        await tx.booking.update({ where: { id: booking.id }, data: { amountPaidMinor: amountPaid } });
      }

      if (session) {
        await tx.session.update({
          where: { id: session.id },
          data: { seatsTaken: session.seatsTaken + guests, status: session.seatsTaken + guests >= session.capacity ? "full" : "scheduled" },
        });
      }
      if (retreat) {
        await tx.retreat.update({ where: { id: retreat.id }, data: { placesTaken: retreat.placesTaken + guests } });
      }
      if (event) {
        await tx.event.update({ where: { id: event.id }, data: { placesTaken: event.placesTaken + guests } });
      }
      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { redemptionCount: coupon.redemptionCount + 1 } });
      }

      await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: 20 } } });

      const owed = total - amountPaid;
      await tx.notification.create({
        data: {
          userId, bookingId: booking.id, event: "booking_confirmed", channel: "push",
          title: status === "pending" ? "Request received" : "Booking confirmed",
          body: `${session?.title || pkg.name}, booking ${booking.reference}.`,
          scheduledFor: new Date(), sentAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          userId, bookingId: booking.id, event: amountPaid > 0 ? "payment_received" : "payment_due", channel: "email",
          title: amountPaid > 0 ? "Payment received" : "Payment due at the studio",
          body: amountPaid > 0 ? `Paid via ${method || "card"}. Receipt emailed.` : `${formatMoney(owed)} to settle when you arrive.`,
          scheduledFor: new Date(), sentAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: { actorUserId: userId, entityTable: "bookings", entityId: booking.id, action: "create", diff: JSON.stringify({ packageId, sessionId, retreatId, guests, total }) },
      });

      return booking;
    });

    const full = await db.booking.findUnique({ where: { id: result.id }, include: FULL_INCLUDE });
    res.status(201).json(serializeCustomer(full));

    if (full) {
      const paidLabel = full.amountPaidMinor > 0 ? formatMoney(full.amountPaidMinor) : "Not yet paid — due at the studio";
      notifyOwner(
        `New booking: ${full.user.fullName} — ${full.reference}`,
        `<h2 style="margin:0 0 12px">New booking</h2>
         <p><b>${full.user.fullName}</b> booked <b>${full.session?.title || full.package.name}</b>.</p>
         <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
           <tr><td><b>Reference</b></td><td>${full.reference}</td></tr>
           <tr><td><b>When</b></td><td>${customerMeta(full)}</td></tr>
           <tr><td><b>Guests</b></td><td>${full.guestCount}</td></tr>
           <tr><td><b>Status</b></td><td>${full.status}</td></tr>
           <tr><td><b>Total</b></td><td>${formatMoney(full.totalMinor)}</td></tr>
           <tr><td><b>Paid</b></td><td>${paidLabel}</td></tr>
           <tr><td><b>Customer email</b></td><td>${full.user.email}</td></tr>
           <tr><td><b>Customer phone</b></td><td>${full.user.phoneE164 || "—"}</td></tr>
           ${full.specialRequests ? `<tr><td><b>Notes</b></td><td>${full.specialRequests}</td></tr>` : ""}
         </table>`
      );

      const title = full.session?.title || full.package.name;
      notifyCustomer(
        full.userId,
        full.status === "pending" ? `Request received — ${title}` : `Booking confirmed — ${title}`,
        `<p>${full.status === "pending"
          ? `We've received your request for <b>${title}</b> and will confirm shortly.`
          : `Your booking for <b>${title}</b> is confirmed. See you there!`}</p>
         <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
           <tr><td><b>Reference</b></td><td>${full.reference}</td></tr>
           <tr><td><b>When</b></td><td>${customerMeta(full)}</td></tr>
           <tr><td><b>Guests</b></td><td>${full.guestCount}</td></tr>
           <tr><td><b>Total</b></td><td>${formatMoney(full.totalMinor)}</td></tr>
           <tr><td><b>Paid</b></td><td>${paidLabel}</td></tr>
         </table>`
      );
    }
  } catch (e: any) {
    res.status(409).json({ error: e.message || "Could not create booking" });
  }
});

bookingsRouter.patch("/:id/cancel", async (req, res) => {
  const booking = await db.booking.findUnique({ where: { id: req.params.id }, include: { session: true, retreat: true, event: true } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.userId !== req.userId && !isStaff(req)) return res.status(403).json({ error: "Not allowed" });
  if (booking.status === "cancelled") return res.json({ ok: true });

  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { status: "cancelled", cancelledAt: new Date() } });
    if (booking.session) {
      await tx.session.update({
        where: { id: booking.session.id },
        data: { seatsTaken: Math.max(0, booking.session.seatsTaken - booking.guestCount), status: "scheduled" },
      });
    }
    if (booking.retreat) {
      await tx.retreat.update({ where: { id: booking.retreat.id }, data: { placesTaken: Math.max(0, booking.retreat.placesTaken - booking.guestCount) } });
    }
    if (booking.event) {
      await tx.event.update({ where: { id: booking.event.id }, data: { placesTaken: Math.max(0, booking.event.placesTaken - booking.guestCount) } });
    }
    if (booking.amountPaidMinor > 0) {
      await tx.payment.create({
        data: { bookingId: booking.id, kind: "refund", method: "card", amountMinor: -booking.amountPaidMinor, status: "refunded", paidAt: new Date(), currency: booking.currency },
      });
    }
    await tx.notification.create({
      data: { userId: booking.userId, bookingId: booking.id, event: "cancelled", channel: "push", title: "Booking cancelled", body: `${booking.reference} cancelled · refund in 3 days`, scheduledFor: new Date(), sentAt: new Date() },
    });
    await tx.auditLog.create({ data: { actorUserId: req.userId!, entityTable: "bookings", entityId: booking.id, action: "update", diff: JSON.stringify({ status: "cancelled" }) } });
  });
  await recomputeAmountPaid(booking.id);
  notifyCustomer(
    booking.userId, `Booking cancelled — ${booking.reference}`,
    `<p>Your booking <b>${booking.reference}</b> has been cancelled.${booking.amountPaidMinor > 0 ? " Any payment will be refunded within 3 business days." : ""}</p>`
  );
  res.json({ ok: true });
});

bookingsRouter.patch("/:id/confirm", async (req, res) => {
  if (!isStaff(req)) return res.status(403).json({ error: "Staff access required" });
  const booking = await db.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  await db.booking.update({ where: { id: booking.id }, data: { status: "confirmed" } });
  await db.notification.create({
    data: { userId: booking.userId, bookingId: booking.id, event: "booking_confirmed", channel: "push", title: "Booking confirmed", body: `${booking.reference} is confirmed. See you there.`, scheduledFor: new Date(), sentAt: new Date() },
  });
  await db.auditLog.create({ data: { actorUserId: req.userId!, entityTable: "bookings", entityId: booking.id, action: "update", diff: JSON.stringify({ status: "confirmed" }) } });
  notifyCustomer(booking.userId, `Booking confirmed — ${booking.reference}`, `<p>Your booking <b>${booking.reference}</b> is confirmed. See you there!</p>`);
  res.json({ ok: true });
});

bookingsRouter.patch("/:id/decline", async (req, res) => {
  if (!isStaff(req)) return res.status(403).json({ error: "Staff access required" });
  const booking = await db.booking.findUnique({ where: { id: req.params.id }, include: { session: true } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { status: "cancelled", cancelledAt: new Date() } });
    if (booking.session) {
      await tx.session.update({ where: { id: booking.session.id }, data: { seatsTaken: Math.max(0, booking.session.seatsTaken - booking.guestCount), status: "scheduled" } });
    }
    await tx.notification.create({
      data: { userId: booking.userId, bookingId: booking.id, event: "cancelled", channel: "email", title: "Request declined", body: `We could not confirm ${booking.reference}. Any payment will be refunded.`, scheduledFor: new Date(), sentAt: new Date() },
    });
    await tx.auditLog.create({ data: { actorUserId: req.userId!, entityTable: "bookings", entityId: booking.id, action: "update", diff: JSON.stringify({ status: "declined" }) } });
  });
  notifyCustomer(
    booking.userId, `Request declined — ${booking.reference}`,
    `<p>We're sorry, we couldn't confirm your request <b>${booking.reference}</b>. Any payment will be refunded within 3 business days.</p>`
  );
  res.json({ ok: true });
});

bookingsRouter.patch("/:id/pay-balance", async (req, res) => {
  const { method } = req.body || {};
  const booking = await db.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.userId !== req.userId && !isStaff(req)) return res.status(403).json({ error: "Not allowed" });
  const balance = booking.totalMinor - booking.amountPaidMinor;
  if (balance <= 0) return res.json({ ok: true });
  await db.payment.create({
    data: { bookingId: booking.id, kind: "balance", method: method || "card", amountMinor: balance, status: "paid", paidAt: new Date(), currency: booking.currency },
  });
  await recomputeAmountPaid(booking.id);
  await db.notification.create({
    data: { userId: booking.userId, bookingId: booking.id, event: "payment_received", channel: "email", title: "Balance paid", body: `Receipt emailed for ${booking.reference}.`, scheduledFor: new Date(), sentAt: new Date() },
  });
  await db.auditLog.create({ data: { actorUserId: req.userId!, entityTable: "payments", entityId: booking.id, action: "update", diff: JSON.stringify({ paidBalanceMinor: balance }) } });
  notifyCustomer(
    booking.userId, `Payment received — ${booking.reference}`,
    `<p>We've received your payment of <b>${formatMoney(balance)}</b> for <b>${booking.reference}</b>. You're all settled.</p>`
  );
  res.json({ ok: true });
});

bookingsRouter.patch("/:id/refund", async (req, res) => {
  if (!isStaff(req)) return res.status(403).json({ error: "Staff access required" });
  const booking = await db.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.amountPaidMinor <= 0) return res.json({ ok: true });
  await db.payment.create({
    data: { bookingId: booking.id, kind: "refund", method: "card", amountMinor: -booking.amountPaidMinor, status: "refunded", paidAt: new Date(), currency: booking.currency },
  });
  await recomputeAmountPaid(booking.id);
  await db.auditLog.create({ data: { actorUserId: req.userId!, entityTable: "payments", entityId: booking.id, action: "refund", diff: JSON.stringify({ refundedMinor: booking.amountPaidMinor }) } });
  res.json({ ok: true });
});

bookingsRouter.post("/:id/remind", async (req, res) => {
  if (!isStaff(req)) return res.status(403).json({ error: "Staff access required" });
  const booking = await db.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  await db.notification.create({
    data: { userId: booking.userId, bookingId: booking.id, event: "payment_due", channel: "push", title: "Reminder", body: `Don't forget ${booking.reference}.`, scheduledFor: new Date(), sentAt: new Date() },
  });
  res.json({ ok: true });
});

bookingsRouter.patch("/:id/checkin", async (req, res) => {
  if (!isStaff(req)) return res.status(403).json({ error: "Staff access required" });
  const booking = await db.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  await db.booking.update({ where: { id: booking.id }, data: { checkedInAt: new Date(), status: "attended" } });
  res.json({ ok: true });
});

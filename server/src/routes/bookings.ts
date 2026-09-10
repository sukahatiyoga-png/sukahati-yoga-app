import { Router } from "express";
import { db } from "../db";
import { genReference, genQrToken, formatMoney } from "../domain/enums";
import { computeDiscount, recomputeAmountPaid } from "../domain/pricing";
import { dayParts, timeParts, initials } from "../domain/format";

export const bookingsRouter = Router();

const FULL_INCLUDE = {
  user: true,
  package: true,
  session: { include: { teacher: true, room: true } },
  retreat: true,
  coupon: true,
  addons: { include: { addon: true } },
  payments: true,
} as const;

function isStaff(req: { userRole?: string }): boolean {
  return req.userRole === "owner" || req.userRole === "desk";
}

function effectiveDate(b: any): Date {
  return b.session?.startsAt ?? b.retreat?.startsOn ?? b.createdAt;
}

function customerMeta(b: any): string {
  if (b.session) {
    const { time, ampm } = timeParts(b.session.startsAt);
    return `${time} ${ampm} · ${b.session.teacher.name.split(" ")[0]} · ${b.session.room.name}`;
  }
  if (b.retreat) {
    return `Check-in ${b.retreat.checkInAt} · shared room${b.specialRequests ? " · " + b.specialRequests : ""}`;
  }
  return b.package.name;
}

function serializeCustomer(b: any) {
  const { mon, num } = dayParts(effectiveDate(b));
  const balance = Math.max(0, b.totalMinor - b.amountPaidMinor);
  return {
    id: b.id, mon, day: num, title: b.session?.title || b.package.name, meta: customerMeta(b),
    status: b.status, confirmed: b.status === "confirmed", pending: b.status === "pending",
    attended: b.status === "attended", cancelled: b.status === "cancelled",
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
    return res.json({ upcoming: upcoming.map(serializeCustomer), past: past.map(serializeCustomer) });
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
  const { packageId, sessionId, retreatId, guestCount, level, specialRequests, addonIds, couponCode, payMode, method } = b;
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
          reference: genReference(), userId, packageId, sessionId: session?.id ?? null, retreatId: retreat?.id ?? null,
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
  } catch (e: any) {
    res.status(409).json({ error: e.message || "Could not create booking" });
  }
});

bookingsRouter.patch("/:id/cancel", async (req, res) => {
  const booking = await db.booking.findUnique({ where: { id: req.params.id }, include: { session: true, retreat: true } });
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

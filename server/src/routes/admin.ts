import { Router } from "express";
import { db } from "../db";
import { startOfDay, endOfDay, initials, timeParts } from "../domain/format";
import { assertNoConflict, findConflicts, ConflictError } from "../domain/scheduling";
import { formatMoney } from "../domain/enums";

export const adminRouter = Router();

// ── Dashboard ──────────────────────────────────────────────────────────
adminRouter.get("/dashboard", async (_req, res) => {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const bookingsToday = await db.booking.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } });
  const paymentsToday = await db.payment.findMany({ where: { status: "paid", paidAt: { gte: todayStart, lte: todayEnd } } });
  const revenueTodayMinor = paymentsToday.reduce((n, p) => n + p.amountMinor, 0);

  const todaySessions = await db.session.findMany({ where: { startsAt: { gte: todayStart, lte: todayEnd }, retreatId: null } });
  const totalCap = todaySessions.reduce((n, s) => n + s.capacity, 0);
  const totalTaken = todaySessions.reduce((n, s) => n + s.seatsTaken, 0);
  const occupancyPct = totalCap ? Math.round((totalTaken / totalCap) * 100) : 0;

  const openBookings = await db.booking.findMany({ where: { status: { not: "cancelled" } } });
  const pendingPayments = openBookings.filter((b) => b.totalMinor - b.amountPaidMinor > 0).length;

  const cancellationsThisWeek = await db.booking.count({ where: { status: "cancelled", cancelledAt: { gte: weekAgo } } });
  const waitlistCount = await db.waitlistEntry.count({ where: { status: "waiting" } });

  const pending = await db.booking.findMany({ where: { status: "pending" }, include: { user: true }, take: 5 });
  const unpaid = openBookings.filter((b) => b.totalMinor - b.amountPaidMinor > 0);
  const unpaidTotal = unpaid.reduce((n, b) => n + (b.totalMinor - b.amountPaidMinor), 0);
  const fullSession = todaySessions.find((s) => s.seatsTaken >= s.capacity);
  const fullSessionInfo = fullSession ? await db.session.findUnique({ where: { id: fullSession.id }, include: { room: true } }) : null;
  const waitlistOnFull = fullSession ? await db.waitlistEntry.count({ where: { sessionId: fullSession.id, status: "waiting" } }) : 0;

  const todo: any[] = [];
  if (pending.length) {
    todo.push({ id: "pending", title: `${pending.length} request${pending.length > 1 ? "s" : ""} awaiting confirmation`, body: pending.map((p) => p.user.fullName).join(" and "), cta: "Review", kind: "review-pending" });
  }
  if (unpaid.length) {
    todo.push({ id: "unpaid", title: `RM ${(unpaidTotal / 100).toLocaleString("en-MY")} unpaid`, body: `${unpaid.length} booking${unpaid.length > 1 ? "s" : ""} with a balance due`, cta: "Chase", kind: "chase-unpaid" });
  }
  if (fullSessionInfo) {
    todo.push({ id: "full", title: `${fullSessionInfo.title} is full`, body: `${waitlistOnFull} guests waiting · ${fullSessionInfo.room.name} holds ${fullSessionInfo.capacity}`, cta: "Open more", kind: "raise-capacity", sessionId: fullSessionInfo.id });
  }

  res.json({
    bookingsToday, revenueTodayMinor, occupancyPct, pendingPayments,
    cancellationsThisWeek, waitlistCount, todo,
  });
});

adminRouter.patch("/sessions/:id/capacity", async (req, res) => {
  const s = await db.session.findUnique({ where: { id: req.params.id } });
  if (!s) return res.status(404).json({ error: "Session not found" });
  const capacity = s.capacity + (Number(req.body?.increaseBy) || 2);
  await db.session.update({ where: { id: s.id }, data: { capacity, status: "scheduled" } });
  res.json({ ok: true, capacity });
});

// ── Calendar ───────────────────────────────────────────────────────────
adminRouter.get("/calendar", async (req, res) => {
  const date = req.query.date ? new Date(String(req.query.date)) : new Date();
  const sessions = await db.session.findMany({
    where: { startsAt: { gte: startOfDay(date), lte: endOfDay(date) }, retreatId: null },
    include: { teacher: true, room: true },
    orderBy: { startsAt: "asc" },
  });
  res.json(sessions.map((s) => {
    const { time, ampm } = timeParts(s.startsAt);
    const pct = Math.round((s.seatsTaken / s.capacity) * 100);
    return {
      id: s.id, time, ampm, title: s.title, assign: `${s.teacher.name} · ${s.room.name}`,
      load: `${s.seatsTaken}/${s.capacity}`, pct: `${pct}%`, pctRaw: pct,
      capacity: s.capacity, status: s.status,
    };
  }));
});

adminRouter.patch("/sessions/:id", async (req, res) => {
  const s = await db.session.findUnique({ where: { id: req.params.id } });
  if (!s) return res.status(404).json({ error: "Session not found" });
  const b = req.body || {};
  const title = b.title !== undefined ? String(b.title) : s.title;
  const capacity = b.capacity !== undefined ? Number(b.capacity) : s.capacity;
  const teacherId = b.teacherId || s.teacherId;
  const roomId = b.roomId || s.roomId;
  try {
    if (teacherId !== s.teacherId || roomId !== s.roomId) {
      await assertNoConflict({ teacherId, roomId, startsAt: s.startsAt, endsAt: s.endsAt, excludeSessionId: s.id });
    }
    const updated = await db.session.update({ where: { id: s.id }, data: { title, capacity, teacherId, roomId } });
    await db.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "sessions", entityId: s.id, action: "update", diff: JSON.stringify({ title, capacity }) },
    }).catch(() => {});
    res.json({ ok: true, id: updated.id });
  } catch (e) {
    if (e instanceof ConflictError) return res.status(409).json({ error: e.message });
    throw e;
  }
});

adminRouter.patch("/sessions/:id/cancel", async (req, res) => {
  const s = await db.session.findUnique({ where: { id: req.params.id }, include: { bookings: { where: { status: { in: ["pending", "confirmed"] } } } } });
  if (!s) return res.status(404).json({ error: "Session not found" });
  let notified = 0;
  await db.$transaction(async (tx) => {
    await tx.session.update({ where: { id: s.id }, data: { status: "cancelled" } });
    for (const b of s.bookings) {
      await tx.notification.create({
        data: { userId: b.userId, bookingId: b.id, event: "schedule_changed", channel: "push", title: "Class cancelled", body: `${s.title} was cancelled by the studio. We'll be in touch to rebook.`, scheduledFor: new Date(), sentAt: new Date() },
      });
      notified++;
    }
    await tx.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "sessions", entityId: s.id, action: "update", diff: JSON.stringify({ status: "cancelled" }) },
    });
  });
  res.json({ ok: true, guestsNotified: notified });
});

adminRouter.post("/sessions", async (req, res) => {
  const { date, title, teacherId, roomId, startTime, durationMinutes, capacity } = req.body || {};
  const day = date ? new Date(date) : new Date(Date.now() + 86400000);
  const [h, m] = String(startTime || "08:00").split(":").map(Number);
  const startsAt = new Date(day);
  startsAt.setHours(h, m || 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + (Number(durationMinutes) || 60) * 60000);

  const teacher = teacherId ? await db.teacher.findUnique({ where: { id: teacherId } }) : await db.teacher.findFirst();
  const room = roomId ? await db.room.findUnique({ where: { id: roomId } }) : await db.room.findFirst({ where: { isAccommodation: false } });
  if (!teacher || !room) return res.status(400).json({ error: "No teacher/room available" });

  try {
    await assertNoConflict({ teacherId: teacher.id, roomId: room.id, startsAt, endsAt });
    const studio = await db.location.findFirst({ where: { kind: "studio" } });
    const session = await db.session.create({
      data: {
        locationId: studio!.id, title: title || "New Session", startsAt, endsAt,
        teacherId: teacher.id, roomId: room.id, capacity: Number(capacity) || 10, seatsTaken: 0,
      },
    });
    res.status(201).json({ ok: true, id: session.id });
  } catch (e) {
    if (e instanceof ConflictError) return res.status(409).json({ error: e.message });
    throw e;
  }
});

adminRouter.post("/days/:date/block", async (req, res) => {
  const day = new Date(req.params.date);
  const sessions = await db.session.findMany({ where: { startsAt: { gte: startOfDay(day), lte: endOfDay(day) } }, include: { bookings: { where: { status: { in: ["pending", "confirmed"] } } } } });
  let notified = 0;
  await db.$transaction(async (tx) => {
    for (const s of sessions) {
      await tx.session.update({ where: { id: s.id }, data: { status: "blocked" } });
      for (const b of s.bookings) {
        await tx.notification.create({
          data: { userId: b.userId, bookingId: b.id, event: "schedule_changed", channel: "push", title: "Class moved", body: `${s.title} on ${day.toDateString()} was blocked by the studio. We'll be in touch to rebook.`, scheduledFor: new Date(), sentAt: new Date() },
        });
        notified++;
      }
    }
  });
  res.json({ ok: true, sessionsBlocked: sessions.length, guestsNotified: notified });
});

// ── Customers ──────────────────────────────────────────────────────────
adminRouter.get("/customers", async (req, res) => {
  const q = (req.query.q as string) || "";
  const users = await db.user.findMany({
    where: { role: "customer", fullName: q ? { contains: q } : undefined },
    include: { preferences: true },
  });
  const out = [];
  for (const u of users) {
    const bookings = await db.booking.findMany({ where: { userId: u.id } });
    const attended = bookings.filter((b) => b.status === "attended").length;
    const noShows = bookings.filter((b) => b.status === "no_show").length;
    const spendMinor = bookings.reduce((n, b) => n + b.amountPaidMinor, 0);
    const bits = [`${attended} classes`];
    if (noShows) bits.push(`${noShows} no-shows`);
    if (u.preferences?.mealPreference) bits.push(u.preferences.mealPreference.toLowerCase());
    if (u.deletedAt) bits.push("deactivated");
    out.push({ id: u.id, name: u.fullName, initials: initials(u.fullName), meta: bits.join(" · "), spendMinor, active: !u.deletedAt });
  }
  out.sort((a, b) => b.spendMinor - a.spendMinor);
  res.json(out);
});

adminRouter.get("/customers/:id", async (req, res) => {
  const u = await db.user.findUnique({ where: { id: req.params.id }, include: { preferences: true } });
  if (!u || u.role !== "customer") return res.status(404).json({ error: "Customer not found" });

  const bookings = await db.booking.findMany({
    where: { userId: u.id },
    include: {
      package: true, session: { include: { teacher: true, room: true } }, retreat: true,
      addons: { include: { addon: true } }, payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const effectiveDate = (b: any) => b.session?.startsAt ?? b.retreat?.startsOn ?? b.createdAt;
  const serializeBooking = (b: any) => {
    const meta = b.session
      ? `${timeParts(b.session.startsAt).time} ${timeParts(b.session.startsAt).ampm} · ${b.session.teacher.name.split(" ")[0]} · ${b.session.room.name}`
      : b.retreat ? `Retreat · ${b.retreat.startsOn.toDateString()}` : b.package.name;
    return {
      id: b.id, reference: b.reference, title: b.session?.title || b.package.name, meta, status: b.status,
      packageName: b.package.name, sessionDate: b.session ? b.session.startsAt.toISOString() : null,
      teacherName: b.session?.teacher.name || null, roomName: b.session?.room.name || null,
      guestCount: b.guestCount, level: b.level, specialRequests: b.specialRequests,
      subtotalMinor: b.subtotalMinor, discountMinor: b.discountMinor, totalMinor: b.totalMinor,
      amountPaidMinor: b.amountPaidMinor, balanceMinor: Math.max(0, b.totalMinor - b.amountPaidMinor),
      currency: b.currency, addons: b.addons.map((a: any) => ({ name: a.addon.name, quantity: a.quantity })),
      payments: b.payments.map((p: any) => ({ kind: p.kind, method: p.method, amountMinor: p.amountMinor, status: p.status, paidAt: p.paidAt ? p.paidAt.toISOString() : null })),
      qrToken: b.qrToken, checkedInAt: b.checkedInAt ? b.checkedInAt.toISOString() : null,
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null, createdAt: b.createdAt.toISOString(),
    };
  };
  const upcoming = bookings.filter((b) => ["pending", "confirmed"].includes(b.status) && effectiveDate(b) >= now);
  const past = bookings.filter((b) => !upcoming.includes(b));
  const attended = bookings.filter((b) => b.status === "attended").length;
  const noShows = bookings.filter((b) => b.status === "no_show").length;
  const spendMinor = bookings.reduce((n, b) => n + b.amountPaidMinor, 0);

  res.json({
    id: u.id, name: u.fullName, email: u.email, phone: u.phoneE164 || "", memberSince: u.createdAt.toISOString(),
    authProvider: u.authProvider, points: u.loyaltyPoints, referralCode: u.referralCode, adminNotes: u.adminNotes,
    active: !u.deletedAt,
    preferences: u.preferences ? {
      usualLevel: u.preferences.usualLevel, preferredTime: u.preferences.preferredTime, mealPreference: u.preferences.mealPreference,
    } : null,
    stats: { classesAttended: attended, noShows, spendMinor },
    bookings: { upcoming: upcoming.map(serializeBooking), past: past.map(serializeBooking) },
  });
});

adminRouter.patch("/customers/:id", async (req, res) => {
  const u = await db.user.findUnique({ where: { id: req.params.id } });
  if (!u || u.role !== "customer") return res.status(404).json({ error: "Customer not found" });
  const b = req.body || {};
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) data.fullName = String(b.name).trim();
  if (b.email !== undefined) data.email = String(b.email).trim().toLowerCase();
  if (b.phone !== undefined) data.phoneE164 = String(b.phone).trim();
  if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nothing to update" });
  try {
    await db.user.update({ where: { id: u.id }, data });
  } catch {
    return res.status(409).json({ error: "That email is already in use" });
  }
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "customers", entityId: u.id, action: "update", diff: JSON.stringify(data) },
  }).catch(() => {});
  res.json({ ok: true });
});

adminRouter.patch("/customers/:id/active", async (req, res) => {
  const u = await db.user.findUnique({ where: { id: req.params.id } });
  if (!u || u.role !== "customer") return res.status(404).json({ error: "Customer not found" });
  const active = !!req.body?.active;
  await db.user.update({ where: { id: u.id }, data: { deletedAt: active ? null : new Date() } });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "customers", entityId: u.id, action: "update", diff: JSON.stringify({ active, customerName: u.fullName }) },
  }).catch(() => {});
  res.json({ ok: true, active });
});

adminRouter.patch("/customers/:id/notes", async (req, res) => {
  const u = await db.user.findUnique({ where: { id: req.params.id } });
  if (!u || u.role !== "customer") return res.status(404).json({ error: "Customer not found" });
  await db.user.update({ where: { id: u.id }, data: { adminNotes: String(req.body?.notes || "") } });
  await db.auditLog.create({
    data: {
      actorUserId: req.userId!, entityTable: "customers", entityId: u.id, action: "update",
      diff: JSON.stringify({ notesUpdated: true, customerName: u.fullName }),
    },
  }).catch(() => {});
  res.json({ ok: true });
});

// ── Reports ────────────────────────────────────────────────────────────
adminRouter.get("/reports", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMoAgo = new Date(now.getTime() - 90 * 86400000);

  const paymentsThisMonth = await db.payment.findMany({ where: { status: "paid", paidAt: { gte: monthStart } } });
  const revenueMinor = paymentsThisMonth.reduce((n, p) => n + p.amountMinor, 0);

  const bookingsThisMonth = await db.booking.findMany({ where: { createdAt: { gte: monthStart } } });
  const cancelled = bookingsThisMonth.filter((b) => b.status === "cancelled").length;
  const cancellationRate = bookingsThisMonth.length ? Math.round((cancelled / bookingsThisMonth.length) * 1000) / 10 : 0;

  const recentBookings = await db.booking.findMany({ where: { createdAt: { gte: threeMoAgo } } });
  const byUser = new Map<string, number>();
  for (const b of recentBookings) byUser.set(b.userId, (byUser.get(b.userId) || 0) + 1);
  const repeaters = [...byUser.values()].filter((n) => n >= 2).length;
  const retentionPct = byUser.size ? Math.round((repeaters / byUser.size) * 100) : 0;

  const packages = await db.package.findMany();
  const revenueByPackage = [];
  for (const p of packages) {
    const pays = await db.payment.findMany({ where: { status: "paid", booking: { packageId: p.id } } });
    const total = pays.reduce((n, x) => n + x.amountMinor, 0);
    if (total > 0) revenueByPackage.push({ name: p.name, amountMinor: total });
  }
  revenueByPackage.sort((a, b) => b.amountMinor - a.amountMinor);
  const top = revenueByPackage.slice(0, 5);
  const maxAmt = Math.max(1, ...top.map((r) => r.amountMinor));

  const sessionsBooked = await db.booking.findMany({ where: { status: { not: "cancelled" }, sessionId: { not: null } }, include: { session: true } });
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const b of sessionsBooked) if (b.session) byWeekday[b.session.startsAt.getDay()]++;
  const maxDay = Math.max(1, ...byWeekday);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fullLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const order = [1, 2, 3, 4, 5, 6, 0];
  const peakBars = order.map((i) => ({ label: labels[i], pct: Math.round((byWeekday[i] / maxDay) * 100) }));

  const allBookings = await db.booking.findMany();
  const avgBookingValueMinor = allBookings.length ? Math.round(allBookings.reduce((n, b) => n + b.totalMinor, 0) / allBookings.length) : 0;
  const paidCount = allBookings.filter((b) => b.amountPaidMinor >= b.totalMinor && b.totalMinor > 0).length;
  const bookingToPaymentRate = allBookings.length ? Math.round((paidCount / allBookings.length) * 100) : 0;
  const waitlistTotal = await db.waitlistEntry.count();
  const waitlistClaimed = await db.waitlistEntry.count({ where: { status: "claimed" } });
  const waitlistConversion = waitlistTotal ? Math.round((waitlistClaimed / waitlistTotal) * 100) : 0;

  let mostPopular = "—";
  const bestDay = order[peakBars.findIndex((p) => p.pct === Math.max(...peakBars.map((x) => x.pct)))];
  const bestSession = sessionsBooked.filter((b) => b.session!.startsAt.getDay() === bestDay).sort((a, b) => a.session!.startsAt.getHours() - b.session!.startsAt.getHours())[0];
  if (bestSession) {
    const { time, ampm } = timeParts(bestSession.session!.startsAt);
    mostPopular = `${fullLabels[bestDay]} ${time} ${ampm}`;
  }

  res.json({
    revenueMinor, bookingsThisMonth: bookingsThisMonth.length, cancellationRate, retentionPct,
    revenueByPackage: top.map((r) => ({ name: r.name, amountMinor: r.amountMinor, pct: Math.round((r.amountMinor / maxAmt) * 100) })),
    peakBars,
    rows: [
      { name: "Most popular date", value: mostPopular },
      { name: "Average booking value", value: `RM ${(avgBookingValueMinor / 100).toLocaleString("en-MY")}` },
      { name: "Booking to payment rate", value: `${bookingToPaymentRate}%` },
      { name: "Waitlist conversion", value: `${waitlistConversion}%` },
    ],
  });
});

// ── Promotions ─────────────────────────────────────────────────────────
function serializeCoupon(c: any) {
  return {
    id: c.id, code: c.code, detail: c.detailLabel, on: c.isActive,
    discountType: c.discountType, discountValue: c.discountValue, minGuests: c.minGuests,
    appliesToPackageId: c.appliesToPackageId, expiresAt: c.expiresAt.toISOString(),
    maxRedemptions: c.maxRedemptions, redemptionCount: c.redemptionCount,
  };
}

adminRouter.get("/coupons", async (_req, res) => {
  const coupons = await db.coupon.findMany({ orderBy: { code: "asc" } });
  res.json(coupons.map(serializeCoupon));
});

adminRouter.post("/coupons", async (req, res) => {
  const b = req.body || {};
  if (!b.code) return res.status(400).json({ error: "Code is required" });
  const existing = await db.coupon.findUnique({ where: { code: String(b.code).toUpperCase() } });
  if (existing) return res.status(409).json({ error: "A coupon with that code already exists" });
  const c = await db.coupon.create({
    data: {
      code: String(b.code).toUpperCase(), discountType: b.discountType === "fixed" ? "fixed" : "percent",
      discountValue: Number(b.discountValue) || 0, minGuests: Number(b.minGuests) || 1,
      appliesToPackageId: b.appliesToPackageId || null,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : new Date(Date.now() + 365 * 86400000),
      maxRedemptions: Number(b.maxRedemptions) || 1000000, isActive: b.isActive !== false,
      detailLabel: b.detail || "",
    },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "coupons", entityId: c.id, action: "create", diff: JSON.stringify({ code: c.code }) },
  }).catch(() => {});
  res.status(201).json(serializeCoupon(c));
});

adminRouter.put("/coupons/:id", async (req, res) => {
  const existing = await db.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Coupon not found" });
  const b = req.body || {};
  const c = await db.coupon.update({
    where: { id: existing.id },
    data: {
      code: b.code ? String(b.code).toUpperCase() : existing.code,
      discountType: b.discountType ?? existing.discountType,
      discountValue: b.discountValue !== undefined ? Number(b.discountValue) : existing.discountValue,
      minGuests: b.minGuests !== undefined ? Number(b.minGuests) : existing.minGuests,
      appliesToPackageId: b.appliesToPackageId !== undefined ? (b.appliesToPackageId || null) : existing.appliesToPackageId,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : existing.expiresAt,
      maxRedemptions: b.maxRedemptions !== undefined ? Number(b.maxRedemptions) : existing.maxRedemptions,
      isActive: b.isActive !== undefined ? !!b.isActive : existing.isActive,
      detailLabel: b.detail ?? existing.detailLabel,
    },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "coupons", entityId: c.id, action: "update", diff: JSON.stringify({ code: c.code }) },
  }).catch(() => {});
  res.json(serializeCoupon(c));
});

adminRouter.delete("/coupons/:id", async (req, res) => {
  const existing = await db.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Coupon not found" });
  await db.booking.updateMany({ where: { couponId: existing.id }, data: { couponId: null } });
  await db.coupon.delete({ where: { id: existing.id } });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "coupons", entityId: existing.id, action: "delete", diff: JSON.stringify({ code: existing.code }) },
  }).catch(() => {});
  res.json({ ok: true });
});

adminRouter.patch("/coupons/:id/toggle", async (req, res) => {
  const c = await db.coupon.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "Coupon not found" });
  const updated = await db.coupon.update({ where: { id: c.id }, data: { isActive: !c.isActive } });
  await db.auditLog.create({
    data: {
      actorUserId: req.userId!, entityTable: "coupons", entityId: c.id, action: "update",
      diff: JSON.stringify({ code: c.code, isActive: updated.isActive }),
    },
  }).catch(() => {});
  res.json({ ok: true, on: updated.isActive });
});

adminRouter.get("/loyalty", async (_req, res) => {
  const pass = await db.booking.findMany({ where: { status: { in: ["confirmed", "attended"] }, package: { kind: "pass" } }, select: { userId: true } });
  const membersOnPlan = new Set(pass.map((b) => b.userId)).size;
  res.json({ pointsPerClass: 20, freeClassAt: 400, referralRewardMinor: 2500, membersOnPlan });
});

// ── Automations ────────────────────────────────────────────────────────
adminRouter.get("/automations", async (_req, res) => {
  const rows = await db.automationSetting.findMany({ orderBy: { sortOrder: "asc" } });
  res.json(rows.map((a) => ({ id: a.id, name: a.name, note: a.note, on: a.isActive })));
});

adminRouter.patch("/automations/:id/toggle", async (req, res) => {
  const a = await db.automationSetting.findUnique({ where: { id: req.params.id } });
  if (!a) return res.status(404).json({ error: "Not found" });
  const updated = await db.automationSetting.update({ where: { id: a.id }, data: { isActive: !a.isActive } });
  res.json({ ok: true, on: updated.isActive });
});

// ── Resources ──────────────────────────────────────────────────────────
adminRouter.get("/teachers", async (_req, res) => {
  const teachers = await db.teacher.findMany();
  const weekStart = startOfDay(new Date());
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const out = [];
  for (const t of teachers) {
    const count = await db.session.count({ where: { teacherId: t.id, startsAt: { gte: weekStart, lt: weekEnd }, status: { not: "cancelled" } } });
    out.push({ id: t.id, name: t.name, initials: initials(t.name), meta: `${JSON.parse(t.specialties).join(", ")}`, load: `${count} classes` });
  }
  res.json(out);
});

adminRouter.get("/rooms", async (_req, res) => {
  const rooms = await db.room.findMany();
  const now = new Date();
  const out = [];
  for (const r of rooms) {
    let state = "Free";
    let meta = r.matCapacity ? `${r.matCapacity} mats · ${r.note}` : r.note;
    if (r.isAccommodation) {
      const retreat = await db.retreat.findFirst({ where: { locationId: r.locationId } });
      const left = retreat ? Math.max(0, (r.beds || 0) - retreat.placesTaken) : r.beds || 0;
      state = `${left} left`;
      meta = `Retreat site · ${retreat ? retreat.placesTaken : 0} assigned`;
    } else {
      const current = await db.session.findFirst({ where: { roomId: r.id, startsAt: { lte: now }, endsAt: { gte: now }, status: { not: "cancelled" } } });
      const next = !current ? await db.session.findFirst({ where: { roomId: r.id, startsAt: { gte: now }, status: { not: "cancelled" } }, orderBy: { startsAt: "asc" } }) : null;
      if (current) state = "In use";
      else if (next) { const { time, ampm } = timeParts(next.startsAt); state = `Booked ${time} ${ampm}`; }
    }
    out.push({ id: r.id, name: r.name, meta, state });
  }
  res.json(out);
});

adminRouter.post("/teachers", async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: "Name is required" });
  const t = await db.teacher.create({
    data: { name: b.name, specialties: JSON.stringify(b.specialties || []), weeklyHourCap: Number(b.weeklyHourCap) || 20 },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "teachers", entityId: t.id, action: "create", diff: JSON.stringify({ name: t.name }) },
  }).catch(() => {});
  res.status(201).json({ id: t.id, name: t.name, specialties: JSON.parse(t.specialties), weeklyHourCap: t.weeklyHourCap });
});

adminRouter.get("/teachers/:id", async (req, res) => {
  const t = await db.teacher.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ error: "Teacher not found" });
  res.json({ id: t.id, name: t.name, specialties: JSON.parse(t.specialties || "[]"), weeklyHourCap: t.weeklyHourCap });
});

adminRouter.put("/teachers/:id", async (req, res) => {
  const existing = await db.teacher.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Teacher not found" });
  const b = req.body || {};
  const t = await db.teacher.update({
    where: { id: existing.id },
    data: {
      name: b.name ?? existing.name,
      specialties: b.specialties !== undefined ? JSON.stringify(b.specialties) : existing.specialties,
      weeklyHourCap: b.weeklyHourCap !== undefined ? Number(b.weeklyHourCap) : existing.weeklyHourCap,
    },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "teachers", entityId: t.id, action: "update", diff: JSON.stringify({ name: t.name }) },
  }).catch(() => {});
  res.json({ id: t.id, name: t.name, specialties: JSON.parse(t.specialties), weeklyHourCap: t.weeklyHourCap });
});

adminRouter.delete("/teachers/:id", async (req, res) => {
  const existing = await db.teacher.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Teacher not found" });
  const sessionCount = await db.session.count({ where: { teacherId: existing.id } });
  const templateCount = await db.classTemplate.count({ where: { defaultTeacherId: existing.id } });
  if (sessionCount > 0 || templateCount > 0) {
    return res.status(400).json({ error: "Can't delete — this teacher is assigned to sessions or class templates" });
  }
  await db.teacher.delete({ where: { id: existing.id } });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "teachers", entityId: existing.id, action: "delete", diff: JSON.stringify({ name: existing.name }) },
  }).catch(() => {});
  res.json({ ok: true });
});

adminRouter.post("/rooms", async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: "Name is required" });
  const location = await db.location.findFirst({ where: { kind: b.isAccommodation ? "retreat" : "studio" } });
  if (!location) return res.status(500).json({ error: "No location seeded" });
  const r = await db.room.create({
    data: {
      locationId: location.id, name: b.name, matCapacity: b.matCapacity ? Number(b.matCapacity) : null,
      isAccommodation: !!b.isAccommodation, beds: b.beds ? Number(b.beds) : null, note: b.note || "",
    },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "rooms", entityId: r.id, action: "create", diff: JSON.stringify({ name: r.name }) },
  }).catch(() => {});
  res.status(201).json({ id: r.id, name: r.name, matCapacity: r.matCapacity, isAccommodation: r.isAccommodation, beds: r.beds, note: r.note });
});

adminRouter.get("/rooms/:id", async (req, res) => {
  const r = await db.room.findUnique({ where: { id: req.params.id } });
  if (!r) return res.status(404).json({ error: "Room not found" });
  res.json({ id: r.id, name: r.name, matCapacity: r.matCapacity, isAccommodation: r.isAccommodation, beds: r.beds, note: r.note });
});

adminRouter.put("/rooms/:id", async (req, res) => {
  const existing = await db.room.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Room not found" });
  const b = req.body || {};
  const r = await db.room.update({
    where: { id: existing.id },
    data: {
      name: b.name ?? existing.name,
      matCapacity: b.matCapacity !== undefined ? (b.matCapacity ? Number(b.matCapacity) : null) : existing.matCapacity,
      isAccommodation: b.isAccommodation !== undefined ? !!b.isAccommodation : existing.isAccommodation,
      beds: b.beds !== undefined ? (b.beds ? Number(b.beds) : null) : existing.beds,
      note: b.note ?? existing.note,
    },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "rooms", entityId: r.id, action: "update", diff: JSON.stringify({ name: r.name }) },
  }).catch(() => {});
  res.json({ id: r.id, name: r.name, matCapacity: r.matCapacity, isAccommodation: r.isAccommodation, beds: r.beds, note: r.note });
});

adminRouter.delete("/rooms/:id", async (req, res) => {
  const existing = await db.room.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Room not found" });
  const sessionCount = await db.session.count({ where: { roomId: existing.id } });
  const templateCount = await db.classTemplate.count({ where: { defaultRoomId: existing.id } });
  if (sessionCount > 0 || templateCount > 0) {
    return res.status(400).json({ error: "Can't delete — this room is used by sessions or class templates" });
  }
  await db.room.delete({ where: { id: existing.id } });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "rooms", entityId: existing.id, action: "delete", diff: JSON.stringify({ name: existing.name }) },
  }).catch(() => {});
  res.json({ ok: true });
});

adminRouter.get("/conflicts", async (_req, res) => {
  res.json({ notes: await findConflicts() });
});

adminRouter.get("/access", async (_req, res) => {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const auditCount = await db.auditLog.count({ where: { createdAt: { gte: monthStart } } });
  res.json([
    { name: "Owner", value: "Full access" },
    { name: "Front desk", value: "Bookings, check-in" },
    { name: "Teachers", value: "Own roster only" },
    { name: "Audit log", value: `${auditCount} entries this month` },
  ]);
});

// ── Today's check-in board ────────────────────────────────────────────
adminRouter.get("/checkins", async (_req, res) => {
  const bookings = await db.booking.findMany({
    where: { status: { in: ["confirmed", "attended"] }, session: { startsAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) } } },
    include: { user: true, session: { include: { teacher: true } }, package: true },
  });
  res.json(bookings.map((b) => {
    const { time, ampm } = timeParts(b.session!.startsAt);
    return {
      id: b.id, name: b.user.fullName, initials: initials(b.user.fullName),
      meta: `${time} ${ampm} ${b.session!.title} · ${b.package.name}`,
      checkedIn: !!b.checkedInAt,
    };
  }));
});

// ── Activity log ───────────────────────────────────────────────────────
// A human-readable feed over the AuditLog table, which every write route
// above already appends to — this is the first place that actually surfaces
// it. Cursor-paginated on the autoincrementing id (newest first).

const ACTION_VERB: Record<string, string> = { create: "created", update: "updated", delete: "deleted", refund: "refunded" };
const ENTITY_LABEL: Record<string, string> = {
  bookings: "a booking", payments: "a payment", packages: "a package",
  teacher_profiles: "a teacher registration", customers: "a customer", coupons: "a coupon",
};

function summarizeActivity(l: { entityTable: string; action: string; diff: string; actorName: string }): string {
  let diff: any = {};
  try { diff = JSON.parse(l.diff || "{}"); } catch { /* ignore malformed diff */ }
  const who = l.actorName;

  switch (l.entityTable) {
    case "bookings":
      if (l.action === "create") return `${who} created a booking${diff.total ? ` for ${formatMoney(diff.total)}` : ""}`;
      if (diff.status) return `${who} marked a booking ${diff.status}`;
      return `${who} updated a booking`;
    case "payments":
      if (l.action === "refund") return `${who} refunded ${formatMoney(diff.refundedMinor || 0)}`;
      if (diff.paidBalanceMinor) return `${who} recorded a payment of ${formatMoney(diff.paidBalanceMinor)}`;
      return `${who} updated a payment`;
    case "packages":
      return `${who} ${l.action === "create" ? "created" : "edited"} the package "${diff.name || "Untitled"}"`;
    case "teacher_profiles":
      if (diff.status) return `${who} set ${diff.teacherName || "a teacher"}'s registration to ${diff.status}`;
      if (diff.notesUpdated) return `${who} updated notes for ${diff.teacherName || "a teacher"}`;
      return `${who} updated a teacher registration`;
    case "customers":
      return `${who} updated notes for ${diff.customerName || "a customer"}`;
    case "coupons":
      return `${who} ${diff.isActive ? "activated" : "deactivated"} coupon ${diff.code || ""}`;
    default:
      return `${who} ${ACTION_VERB[l.action] || l.action} ${ENTITY_LABEL[l.entityTable] || l.entityTable}`;
  }
}

adminRouter.get("/activity", async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

  const logs = await db.auditLog.findMany({
    where: cursor ? { id: { lt: cursor } } : undefined,
    include: { actor: true },
    orderBy: { id: "desc" },
    take: limit,
  });

  const items = logs.map((l) => ({
    id: l.id, actorName: l.actor.fullName, actorRole: l.actor.role,
    entityTable: l.entityTable, entityId: l.entityId, action: l.action,
    summary: summarizeActivity({ entityTable: l.entityTable, action: l.action, diff: l.diff, actorName: l.actor.fullName }),
    createdAt: l.createdAt.toISOString(),
  }));

  res.json({ items, nextCursor: logs.length === limit ? String(logs[logs.length - 1].id) : null });
});

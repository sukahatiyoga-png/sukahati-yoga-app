import { Router } from "express";
import { db } from "../db";
import { startOfDay, endOfDay, initials, timeParts } from "../domain/format";
import { assertNoConflict, findConflicts, ConflictError } from "../domain/scheduling";

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
    };
  }));
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
    where: { role: "customer", deletedAt: null, fullName: q ? { contains: q } : undefined },
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
    out.push({ id: u.id, name: u.fullName, initials: initials(u.fullName), meta: bits.join(" · "), spendMinor });
  }
  out.sort((a, b) => b.spendMinor - a.spendMinor);
  res.json(out);
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
adminRouter.get("/coupons", async (_req, res) => {
  const coupons = await db.coupon.findMany();
  res.json(coupons.map((c) => ({ id: c.id, code: c.code, detail: c.detailLabel, on: c.isActive })));
});

adminRouter.patch("/coupons/:id/toggle", async (req, res) => {
  const c = await db.coupon.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "Coupon not found" });
  const updated = await db.coupon.update({ where: { id: c.id }, data: { isActive: !c.isActive } });
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

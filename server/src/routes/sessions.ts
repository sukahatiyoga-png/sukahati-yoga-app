import { Router } from "express";
import { db } from "../db";
import { startOfDay, endOfDay, timeParts } from "../domain/format";

export const sessionsRouter = Router();

function parseDate(q: unknown): Date {
  if (typeof q === "string" && q) {
    const d = new Date(q);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

async function serialize(s: any, dropInPriceMinor: number) {
  const { time, ampm } = timeParts(s.startsAt);
  const spots = Math.max(0, s.capacity - s.seatsTaken);
  return {
    id: s.id, time, ampm, title: s.title,
    teacher: `${s.teacher.name.split(" ")[0]} · ${s.template?.level || "all levels"} · ${s.room.name}`,
    teacherName: s.teacher.name, roomName: s.room.name,
    spots, cap: s.capacity, seatsTaken: s.seatsTaken,
    cat: s.template?.category || "", dur: `${s.template?.durationMinutes ?? 60} min`,
    rating: s.template?.ratingLabel || "", price: dropInPriceMinor,
    startsAt: s.startsAt.toISOString(), status: s.status,
  };
}

sessionsRouter.get("/", async (req, res) => {
  const date = parseDate(req.query.date);
  const dropIn = await db.package.findFirst({ where: { kind: "single" } });
  const dropInPrice = dropIn?.priceMinor ?? 5000;

  let sessions = await db.session.findMany({
    where: { startsAt: { gte: startOfDay(date), lte: endOfDay(date) }, retreatId: null },
    include: { teacher: true, room: true, template: true },
    orderBy: { startsAt: "asc" },
  });

  const { category, price, duration, availableOnly, q } = req.query as Record<string, string | undefined>;
  if (category) sessions = sessions.filter((s) => s.template?.category === category);
  if (duration && duration !== "Any length") {
    sessions = sessions.filter((s) => `${s.template?.durationMinutes ?? 60} min` === duration);
  }
  if (price && price !== "Any price") {
    const p = dropInPrice / 100;
    if (price === "Under 100") sessions = sessions.filter(() => p < 100);
    else if (price === "100 – 400") sessions = sessions.filter(() => p >= 100 && p <= 400);
    else if (price === "400 and up") sessions = sessions.filter(() => p > 400);
  }
  if (availableOnly === "1") sessions = sessions.filter((s) => s.capacity - s.seatsTaken > 0);
  if (q) {
    const needle = q.toLowerCase();
    sessions = sessions.filter((s) => (s.title + " " + s.teacher.name).toLowerCase().includes(needle));
  }

  res.json(await Promise.all(sessions.map((s) => serialize(s, dropInPrice))));
});

sessionsRouter.get("/:id", async (req, res) => {
  const s = await db.session.findUnique({ where: { id: req.params.id }, include: { teacher: true, room: true, template: true } });
  if (!s) return res.status(404).json({ error: "Session not found" });
  const dropIn = await db.package.findFirst({ where: { kind: "single" } });
  res.json(await serialize(s, dropIn?.priceMinor ?? 5000));
});

sessionsRouter.post("/:id/waitlist", async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId required" });
  const session = await db.session.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });
  const existing = await db.waitlistEntry.findUnique({ where: { sessionId_userId: { sessionId: session.id, userId } } });
  if (existing) return res.json({ ok: true, alreadyOn: true });
  const count = await db.waitlistEntry.count({ where: { sessionId: session.id } });
  await db.waitlistEntry.create({ data: { sessionId: session.id, userId, position: count + 1 } });
  res.json({ ok: true });
});

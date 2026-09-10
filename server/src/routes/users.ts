import { Router } from "express";
import { db } from "../db";

export const usersRouter = Router();

function canAccess(req: { userId?: string; userRole?: string }, targetId: string): boolean {
  return req.userId === targetId || req.userRole === "owner" || req.userRole === "desk";
}

async function profileStats(userId: string) {
  const attended = await db.booking.count({ where: { userId, status: "attended" } });
  const referred = await db.user.count({ where: { referredById: userId } });
  return { attended, referred };
}

async function serialize(u: any) {
  const { attended, referred } = await profileStats(u.id);
  return {
    id: u.id, name: u.fullName, email: u.email, phone: u.phoneE164 || "",
    memberSince: u.createdAt.toISOString(), authProvider: u.authProvider,
    points: u.loyaltyPoints, classesAttended: attended, friendsReferred: referred,
    referralCode: u.referralCode, role: u.role,
    preferences: u.preferences ? {
      usualLevel: u.preferences.usualLevel, preferredTime: u.preferences.preferredTime,
      mealPreference: u.preferences.mealPreference, savedPaymentLabel: "Visa ···· 4218",
    } : null,
  };
}

usersRouter.get("/me", async (req, res) => {
  const u = await db.user.findUnique({ where: { id: req.userId }, include: { preferences: true } });
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json(await serialize(u));
});

usersRouter.get("/:id", async (req, res) => {
  if (!canAccess(req, req.params.id)) return res.status(403).json({ error: "Not allowed" });
  const u = await db.user.findUnique({ where: { id: req.params.id }, include: { preferences: true } });
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json(await serialize(u));
});

usersRouter.patch("/:id", async (req, res) => {
  if (!canAccess(req, req.params.id)) return res.status(403).json({ error: "Not allowed" });
  const { name, email, phone } = req.body || {};
  const u = await db.user.update({
    where: { id: req.params.id },
    data: { fullName: name, email: email ? String(email).trim().toLowerCase() : undefined, phoneE164: phone },
    include: { preferences: true },
  });
  res.json(await serialize(u));
});

// Active multi-day pass (kind=pass) — powers the "Your pass" card on Home
// and Bookings. Picks the most recently started pass that hasn't expired.
usersRouter.get("/:id/pass", async (req, res) => {
  if (!canAccess(req, req.params.id)) return res.status(403).json({ error: "Not allowed" });
  const bookings = await db.booking.findMany({
    where: { userId: req.params.id, status: { in: ["confirmed", "attended"] }, package: { kind: "pass" } },
    include: { package: true },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  for (const b of bookings) {
    const days = b.package.validityDays || 0;
    const ends = new Date(b.createdAt.getTime() + days * 86400000);
    if (ends >= now) {
      const elapsedDays = Math.floor((now.getTime() - b.createdAt.getTime()) / 86400000);
      const daysLeft = Math.max(0, days - elapsedDays);
      const pct = Math.min(100, Math.round((elapsedDays / days) * 100));
      const endLabel = ends.toDateString().slice(0, 10);
      return res.json({ packageName: b.package.name, daysLeft, pct, endLabel, startedAt: b.createdAt.toISOString() });
    }
  }
  res.json(null);
});

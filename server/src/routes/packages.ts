import { Router, Request, Response } from "express";
import { db } from "../db";
import { toMinor } from "../domain/enums";
import { requireAuth, requireStaff } from "../domain/auth";

export const packagesRouter = Router();

function serialize(p: any, sold: number, revenueMinor: number, retreat?: any, earlyBirdSaveMinor?: number) {
  return {
    id: p.id, name: p.name, kind: p.kind, priceMinor: p.priceMinor, currency: p.currency,
    unit: p.billingUnit, capacity: p.capacityLabel, sold, revenueMinor,
    active: p.isVisible, recommended: p.isRecommended, badge: p.badge || "",
    desc: p.shortDescription, long: p.longDescription, goodFor: p.goodFor,
    cat: p.category, dur: p.durationLabel, rating: p.ratingLabel,
    valid: p.validLabel, cancel: p.cancelLabel,
    incl: JSON.parse(p.inclusions || "[]"), excl: JSON.parse(p.exclusions || "[]"),
    sortOrder: p.sortOrder,
    retreat: retreat ? {
      startsOn: retreat.startsOn.toISOString(), endsOn: retreat.endsOn.toISOString(),
      totalPlaces: retreat.totalPlaces, placesLeft: Math.max(0, retreat.totalPlaces - retreat.placesTaken),
      earlyBirdUntil: retreat.earlyBirdUntil ? retreat.earlyBirdUntil.toISOString() : null,
      earlyBirdSaveMinor: earlyBirdSaveMinor || 0,
    } : null,
  };
}

async function retreatFor(p: any) {
  if (p.kind !== "retreat") return { retreat: null, earlyBirdSaveMinor: 0 };
  const retreat = await db.retreat.findUnique({ where: { packageId: p.id } });
  let earlyBirdSaveMinor = 0;
  if (retreat && retreat.earlyBirdUntil && retreat.earlyBirdUntil >= new Date()) {
    const coupon = await db.coupon.findFirst({ where: { appliesToPackageId: p.id, isActive: true, discountType: "percent" } });
    if (coupon) earlyBirdSaveMinor = Math.round((p.priceMinor * coupon.discountValue) / 100);
  }
  return { retreat, earlyBirdSaveMinor };
}

async function soldAndRevenue(packageId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const bookings = await db.booking.findMany({
    where: { packageId, status: { in: ["confirmed", "attended"] } },
    select: { guestCount: true },
  });
  const sold = bookings.reduce((n, b) => n + b.guestCount, 0);
  const payments = await db.payment.findMany({
    where: { status: "paid", createdAt: { gte: monthStart }, booking: { packageId } },
    select: { amountMinor: true },
  });
  const revenueMinor = payments.reduce((n, p) => n + p.amountMinor, 0);
  return { sold, revenueMinor };
}

packagesRouter.get("/", async (req, res) => {
  const includeHidden = req.query.all === "1";
  const packages = await db.package.findMany({
    where: includeHidden ? undefined : { isVisible: true },
    orderBy: { sortOrder: "asc" },
  });
  const out = [];
  for (const p of packages) {
    const { sold, revenueMinor } = await soldAndRevenue(p.id);
    const { retreat, earlyBirdSaveMinor } = await retreatFor(p);
    out.push(serialize(p, sold, revenueMinor, retreat, earlyBirdSaveMinor));
  }
  res.json(out);
});

packagesRouter.get("/:id", async (req, res) => {
  const p = await db.package.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "Package not found" });
  const { sold, revenueMinor } = await soldAndRevenue(p.id);
  const { retreat, earlyBirdSaveMinor } = await retreatFor(p);
  res.json(serialize(p, sold, revenueMinor, retreat, earlyBirdSaveMinor));
});

packagesRouter.post("/", requireAuth, requireStaff, async (req: Request, res: Response) => {
  const b = req.body || {};
  const location = await db.location.findFirst({ where: { kind: "studio" } });
  if (!location) return res.status(500).json({ error: "No studio location seeded" });
  const p = await db.package.create({
    data: {
      locationId: location.id,
      name: b.name || "Untitled package",
      kind: b.kind || "single",
      priceMinor: toMinor(Number(b.priceRaw ?? b.price ?? 0)),
      billingUnit: b.unit || "per class",
      capacityLabel: b.capacity || "",
      shortDescription: b.desc || "",
      isVisible: b.active !== false,
      isRecommended: !!b.recommended,
      badge: b.badge || "",
      inclusions: JSON.stringify([]),
      exclusions: JSON.stringify([]),
      sortOrder: (await db.package.count()) + 1,
    },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "packages", entityId: p.id, action: "create", diff: JSON.stringify(b) },
  }).catch(() => {});
  res.status(201).json(serialize(p, 0, 0));
});

packagesRouter.put("/:id", requireAuth, requireStaff, async (req: Request<{ id: string }>, res: Response) => {
  const b = req.body || {};
  const existing = await db.package.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Package not found" });
  const p = await db.package.update({
    where: { id: req.params.id },
    data: {
      name: b.name ?? existing.name,
      priceMinor: b.priceRaw !== undefined ? toMinor(Number(b.priceRaw)) : existing.priceMinor,
      billingUnit: b.unit ?? existing.billingUnit,
      capacityLabel: b.capacity ?? existing.capacityLabel,
      shortDescription: b.desc ?? existing.shortDescription,
      isVisible: b.active !== undefined ? !!b.active : existing.isVisible,
      isRecommended: b.recommended !== undefined ? !!b.recommended : existing.isRecommended,
      badge: b.badge ?? existing.badge,
    },
  });
  await db.auditLog.create({
    data: {
      actorUserId: req.userId!, entityTable: "packages", entityId: p.id, action: "update",
      diff: JSON.stringify({ name: p.name, priceMinor: p.priceMinor, isVisible: p.isVisible, isRecommended: p.isRecommended }),
    },
  }).catch(() => {});
  const { sold, revenueMinor } = await soldAndRevenue(p.id);
  res.json(serialize(p, sold, revenueMinor));
});

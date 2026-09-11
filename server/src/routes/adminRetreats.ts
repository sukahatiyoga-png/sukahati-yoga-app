import { Router } from "express";
import { db } from "../db";
import { toMinor } from "../domain/enums";

export const adminRetreatsRouter = Router();

function serialize(p: any, r: any, sold: number, revenueMinor: number) {
  return {
    id: p.id, name: p.name, priceMinor: p.priceMinor, currency: p.currency, unit: p.billingUnit,
    desc: p.shortDescription, long: p.longDescription, goodFor: p.goodFor, cat: p.category,
    dur: p.durationLabel, rating: p.ratingLabel, capacityLabel: p.capacityLabel,
    cancellationHours: p.cancellationHours, cancelLabel: p.cancelLabel,
    incl: JSON.parse(p.inclusions || "[]"), excl: JSON.parse(p.exclusions || "[]"),
    active: p.isVisible, recommended: p.isRecommended, badge: p.badge || "", sortOrder: p.sortOrder,
    sold, revenueMinor,
    startsOn: r.startsOn.toISOString(), endsOn: r.endsOn.toISOString(),
    checkInAt: r.checkInAt, checkOutAt: r.checkOutAt,
    totalPlaces: r.totalPlaces, placesTaken: r.placesTaken, placesLeft: Math.max(0, r.totalPlaces - r.placesTaken),
    earlyBirdUntil: r.earlyBirdUntil ? r.earlyBirdUntil.toISOString() : null,
  };
}

async function soldAndRevenue(packageId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const bookings = await db.booking.findMany({ where: { packageId, status: { in: ["confirmed", "attended"] } }, select: { guestCount: true } });
  const sold = bookings.reduce((n, b) => n + b.guestCount, 0);
  const payments = await db.payment.findMany({ where: { status: "paid", createdAt: { gte: monthStart }, booking: { packageId } }, select: { amountMinor: true } });
  const revenueMinor = payments.reduce((n, p) => n + p.amountMinor, 0);
  return { sold, revenueMinor };
}

adminRetreatsRouter.get("/", async (_req, res) => {
  const packages = await db.package.findMany({ where: { kind: "retreat" }, orderBy: { sortOrder: "asc" } });
  const out = [];
  for (const p of packages) {
    const retreat = await db.retreat.findUnique({ where: { packageId: p.id } });
    if (!retreat) continue;
    const { sold, revenueMinor } = await soldAndRevenue(p.id);
    out.push(serialize(p, retreat, sold, revenueMinor));
  }
  res.json(out);
});

adminRetreatsRouter.get("/:id", async (req, res) => {
  const p = await db.package.findUnique({ where: { id: req.params.id } });
  if (!p || p.kind !== "retreat") return res.status(404).json({ error: "Retreat not found" });
  const retreat = await db.retreat.findUnique({ where: { packageId: p.id } });
  if (!retreat) return res.status(404).json({ error: "Retreat not found" });
  const { sold, revenueMinor } = await soldAndRevenue(p.id);
  res.json(serialize(p, retreat, sold, revenueMinor));
});

adminRetreatsRouter.post("/", async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.startsOn || !b.endsOn) return res.status(400).json({ error: "Name, start date and end date are required" });

  let location = await db.location.findFirst({ where: { kind: "retreat" } });
  if (!location) {
    location = await db.location.create({ data: { name: b.locationName || "Retreat site", kind: "retreat" } });
  }

  const result = await db.$transaction(async (tx) => {
    const p = await tx.package.create({
      data: {
        locationId: location!.id, name: b.name, kind: "retreat",
        priceMinor: toMinor(Number(b.priceRaw ?? 0)), billingUnit: b.unit || "per person",
        capacityLabel: b.capacityLabel || "", shortDescription: b.desc || "", longDescription: b.long || "",
        goodFor: b.goodFor || "", category: b.category || "Retreat", durationLabel: b.dur || "",
        ratingLabel: b.rating || "", cancellationHours: Number(b.cancellationHours) || 336, cancelLabel: b.cancelLabel || "",
        inclusions: JSON.stringify(b.incl || []), exclusions: JSON.stringify(b.excl || []),
        isVisible: b.active !== false, isRecommended: !!b.recommended, badge: b.badge || "",
        sortOrder: (await tx.package.count()) + 1,
      },
    });
    const r = await tx.retreat.create({
      data: {
        packageId: p.id, locationId: location!.id,
        startsOn: new Date(b.startsOn), endsOn: new Date(b.endsOn),
        checkInAt: b.checkInAt || "14:00", checkOutAt: b.checkOutAt || "11:00",
        totalPlaces: Number(b.totalPlaces) || 0, earlyBirdUntil: b.earlyBirdUntil ? new Date(b.earlyBirdUntil) : null,
      },
    });
    await tx.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "retreats", entityId: p.id, action: "create", diff: JSON.stringify({ name: p.name }) },
    });
    return { p, r };
  });

  res.status(201).json(serialize(result.p, result.r, 0, 0));
});

adminRetreatsRouter.put("/:id", async (req, res) => {
  const b = req.body || {};
  const existing = await db.package.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.kind !== "retreat") return res.status(404).json({ error: "Retreat not found" });
  const existingRetreat = await db.retreat.findUnique({ where: { packageId: existing.id } });
  if (!existingRetreat) return res.status(404).json({ error: "Retreat not found" });

  const result = await db.$transaction(async (tx) => {
    const p = await tx.package.update({
      where: { id: existing.id },
      data: {
        name: b.name ?? existing.name,
        priceMinor: b.priceRaw !== undefined ? toMinor(Number(b.priceRaw)) : existing.priceMinor,
        billingUnit: b.unit ?? existing.billingUnit, capacityLabel: b.capacityLabel ?? existing.capacityLabel,
        shortDescription: b.desc ?? existing.shortDescription, longDescription: b.long ?? existing.longDescription,
        goodFor: b.goodFor ?? existing.goodFor, category: b.category ?? existing.category,
        durationLabel: b.dur ?? existing.durationLabel, ratingLabel: b.rating ?? existing.ratingLabel,
        cancellationHours: b.cancellationHours !== undefined ? Number(b.cancellationHours) : existing.cancellationHours,
        cancelLabel: b.cancelLabel ?? existing.cancelLabel,
        inclusions: b.incl !== undefined ? JSON.stringify(b.incl) : existing.inclusions,
        exclusions: b.excl !== undefined ? JSON.stringify(b.excl) : existing.exclusions,
        isVisible: b.active !== undefined ? !!b.active : existing.isVisible,
        isRecommended: b.recommended !== undefined ? !!b.recommended : existing.isRecommended,
        badge: b.badge ?? existing.badge,
      },
    });
    const r = await tx.retreat.update({
      where: { packageId: existing.id },
      data: {
        startsOn: b.startsOn ? new Date(b.startsOn) : existingRetreat.startsOn,
        endsOn: b.endsOn ? new Date(b.endsOn) : existingRetreat.endsOn,
        checkInAt: b.checkInAt ?? existingRetreat.checkInAt, checkOutAt: b.checkOutAt ?? existingRetreat.checkOutAt,
        totalPlaces: b.totalPlaces !== undefined ? Number(b.totalPlaces) : existingRetreat.totalPlaces,
        earlyBirdUntil: b.earlyBirdUntil !== undefined ? (b.earlyBirdUntil ? new Date(b.earlyBirdUntil) : null) : existingRetreat.earlyBirdUntil,
      },
    });
    await tx.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "retreats", entityId: p.id, action: "update", diff: JSON.stringify({ name: p.name }) },
    });
    return { p, r };
  });

  const { sold, revenueMinor } = await soldAndRevenue(result.p.id);
  res.json(serialize(result.p, result.r, sold, revenueMinor));
});

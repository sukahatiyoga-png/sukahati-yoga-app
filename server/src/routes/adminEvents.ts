import { Router } from "express";
import { db } from "../db";
import { toMinor } from "../domain/enums";

export const adminEventsRouter = Router();

function serialize(p: any, ev: any, sold: number, revenueMinor: number) {
  return {
    id: p.id, name: p.name, priceMinor: p.priceMinor, currency: p.currency, unit: p.billingUnit,
    desc: p.shortDescription, long: p.longDescription, goodFor: p.goodFor, cat: p.category,
    dur: p.durationLabel, rating: p.ratingLabel, capacityLabel: p.capacityLabel,
    cancellationHours: p.cancellationHours, cancelLabel: p.cancelLabel,
    incl: JSON.parse(p.inclusions || "[]"), excl: JSON.parse(p.exclusions || "[]"),
    active: p.isVisible, recommended: p.isRecommended, badge: p.badge || "", sortOrder: p.sortOrder,
    sold, revenueMinor,
    startsAt: ev.startsAt.toISOString(), endsAt: ev.endsAt.toISOString(),
    totalPlaces: ev.totalPlaces, placesTaken: ev.placesTaken, placesLeft: Math.max(0, ev.totalPlaces - ev.placesTaken),
    earlyBirdUntil: ev.earlyBirdUntil ? ev.earlyBirdUntil.toISOString() : null,
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

adminEventsRouter.get("/", async (_req, res) => {
  const packages = await db.package.findMany({ where: { kind: "event" }, orderBy: { sortOrder: "asc" } });
  const out = [];
  for (const p of packages) {
    const ev = await db.event.findUnique({ where: { packageId: p.id } });
    if (!ev) continue;
    const { sold, revenueMinor } = await soldAndRevenue(p.id);
    out.push(serialize(p, ev, sold, revenueMinor));
  }
  res.json(out);
});

adminEventsRouter.get("/:id", async (req, res) => {
  const p = await db.package.findUnique({ where: { id: req.params.id } });
  if (!p || p.kind !== "event") return res.status(404).json({ error: "Event not found" });
  const ev = await db.event.findUnique({ where: { packageId: p.id } });
  if (!ev) return res.status(404).json({ error: "Event not found" });
  const { sold, revenueMinor } = await soldAndRevenue(p.id);
  res.json(serialize(p, ev, sold, revenueMinor));
});

adminEventsRouter.post("/", async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.startsAt || !b.endsAt) return res.status(400).json({ error: "Name, start and end are required" });

  const location = await db.location.findFirst({ where: { kind: "studio" } });
  if (!location) return res.status(500).json({ error: "No studio location seeded" });

  const result = await db.$transaction(async (tx) => {
    const p = await tx.package.create({
      data: {
        locationId: location.id, name: b.name, kind: "event",
        priceMinor: toMinor(Number(b.priceRaw ?? 0)), billingUnit: b.unit || "per person",
        capacityLabel: b.capacityLabel || "", shortDescription: b.desc || "", longDescription: b.long || "",
        goodFor: b.goodFor || "", category: b.category || "Event", durationLabel: b.dur || "",
        ratingLabel: b.rating || "", cancellationHours: Number(b.cancellationHours) || 24, cancelLabel: b.cancelLabel || "",
        inclusions: JSON.stringify(b.incl || []), exclusions: JSON.stringify(b.excl || []),
        isVisible: b.active !== false, isRecommended: !!b.recommended, badge: b.badge || "",
        sortOrder: (await tx.package.count()) + 1,
      },
    });
    const ev = await tx.event.create({
      data: {
        packageId: p.id, locationId: location.id,
        startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt),
        totalPlaces: Number(b.totalPlaces) || 0, earlyBirdUntil: b.earlyBirdUntil ? new Date(b.earlyBirdUntil) : null,
      },
    });
    await tx.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "events", entityId: p.id, action: "create", diff: JSON.stringify({ name: p.name }) },
    });
    return { p, ev };
  });

  res.status(201).json(serialize(result.p, result.ev, 0, 0));
});

adminEventsRouter.put("/:id", async (req, res) => {
  const b = req.body || {};
  const existing = await db.package.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.kind !== "event") return res.status(404).json({ error: "Event not found" });
  const existingEvent = await db.event.findUnique({ where: { packageId: existing.id } });
  if (!existingEvent) return res.status(404).json({ error: "Event not found" });

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
    const ev = await tx.event.update({
      where: { packageId: existing.id },
      data: {
        startsAt: b.startsAt ? new Date(b.startsAt) : existingEvent.startsAt,
        endsAt: b.endsAt ? new Date(b.endsAt) : existingEvent.endsAt,
        totalPlaces: b.totalPlaces !== undefined ? Number(b.totalPlaces) : existingEvent.totalPlaces,
        earlyBirdUntil: b.earlyBirdUntil !== undefined ? (b.earlyBirdUntil ? new Date(b.earlyBirdUntil) : null) : existingEvent.earlyBirdUntil,
      },
    });
    await tx.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "events", entityId: p.id, action: "update", diff: JSON.stringify({ name: p.name }) },
    });
    return { p, ev };
  });

  const { sold, revenueMinor } = await soldAndRevenue(result.p.id);
  res.json(serialize(result.p, result.ev, sold, revenueMinor));
});

adminEventsRouter.delete("/:id", async (req, res) => {
  const existing = await db.package.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.kind !== "event") return res.status(404).json({ error: "Event not found" });
  const bookingCount = await db.booking.count({ where: { packageId: existing.id } });
  if (bookingCount > 0) {
    return res.status(400).json({ error: `Can't delete — ${bookingCount} booking(s) reference this event. Hide it instead.` });
  }
  await db.$transaction(async (tx) => {
    await tx.coupon.updateMany({ where: { appliesToPackageId: existing.id }, data: { appliesToPackageId: null } });
    await tx.event.delete({ where: { packageId: existing.id } });
    await tx.package.delete({ where: { id: existing.id } });
    await tx.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "events", entityId: existing.id, action: "delete", diff: JSON.stringify({ name: existing.name }) },
    });
  });
  res.json({ ok: true });
});

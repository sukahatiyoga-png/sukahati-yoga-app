import { Router, Request, Response } from "express";
import { db } from "../db";
import { requireAuth, requireStaff } from "../domain/auth";

export const studioPhotosRouter = Router();

function serialize(p: { id: string; imageUrl: string; caption: string; sortOrder: number }) {
  return { id: p.id, imageUrl: p.imageUrl, caption: p.caption, sortOrder: p.sortOrder };
}

// Browsing is public (shown on the customer home page); only admins can upload/remove.
studioPhotosRouter.get("/", async (_req, res) => {
  const photos = await db.studioPhoto.findMany({ orderBy: { sortOrder: "asc" } });
  res.json(photos.map(serialize));
});

studioPhotosRouter.post("/", requireAuth, requireStaff, async (req, res) => {
  const b = req.body || {};
  if (!b.imageUrl) return res.status(400).json({ error: "An image is required" });
  const count = await db.studioPhoto.count();
  const p = await db.studioPhoto.create({
    data: { imageUrl: b.imageUrl, caption: b.caption || "", sortOrder: count },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "studio_photos", entityId: p.id, action: "create", diff: JSON.stringify({ caption: p.caption }) },
  }).catch(() => {});
  res.status(201).json(serialize(p));
});

studioPhotosRouter.delete("/:id", requireAuth, requireStaff, async (req: Request<{ id: string }>, res: Response) => {
  const existing = await db.studioPhoto.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Photo not found" });
  await db.studioPhoto.delete({ where: { id: existing.id } });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "studio_photos", entityId: existing.id, action: "delete", diff: JSON.stringify({ caption: existing.caption }) },
  }).catch(() => {});
  res.json({ ok: true });
});

import { Router } from "express";
import { db } from "../db";
import { requireAuth, requireStaff } from "../domain/auth";

export const studioProfileRouter = Router();

const ID = "default";

function serialize(p: { aboutTitle: string; aboutBody: string; imageUrl: string }) {
  return { aboutTitle: p.aboutTitle, aboutBody: p.aboutBody, imageUrl: p.imageUrl };
}

studioProfileRouter.get("/", async (_req, res) => {
  const p = await db.studioProfile.upsert({ where: { id: ID }, update: {}, create: { id: ID } });
  res.json(serialize(p));
});

studioProfileRouter.put("/", requireAuth, requireStaff, async (req, res) => {
  const b = req.body || {};
  const p = await db.studioProfile.upsert({
    where: { id: ID },
    update: { aboutTitle: b.aboutTitle, aboutBody: b.aboutBody, imageUrl: b.imageUrl },
    create: { id: ID, aboutTitle: b.aboutTitle || undefined, aboutBody: b.aboutBody || undefined, imageUrl: b.imageUrl || "" },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "studio_profile", entityId: ID, action: "update", diff: JSON.stringify(b) },
  }).catch(() => {});
  res.json(serialize(p));
});

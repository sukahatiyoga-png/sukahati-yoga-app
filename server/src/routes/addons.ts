import { Router } from "express";
import { db } from "../db";

export const addonsRouter = Router();

addonsRouter.get("/", async (_req, res) => {
  const addons = await db.addon.findMany({ where: { isActive: true } });
  res.json(addons.map((a) => ({ id: a.id, name: a.name, priceMinor: a.priceMinor })));
});

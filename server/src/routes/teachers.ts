import { Router } from "express";
import { db } from "../db";

export const teachersRouter = Router();

// Public roster listing — customer-facing "meet your teachers", distinct
// from /admin/teachers (same data, staff-only, used for scheduling).
teachersRouter.get("/", async (_req, res) => {
  const teachers = await db.teacher.findMany({ orderBy: { name: "asc" } });
  res.json(teachers.map((t) => ({
    id: t.id, name: t.name, specialties: JSON.parse(t.specialties || "[]"),
    photoUrl: t.photoUrl, bio: t.bio,
  })));
});

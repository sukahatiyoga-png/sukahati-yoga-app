import { Router } from "express";
import { db } from "../db";
import { initials, dateLabel } from "../domain/format";

export const adminTeachersRouter = Router();

function serializeRow(p: any, visits: any[]) {
  const upcoming = visits
    .filter((v) => v.status !== "cancelled" && v.proposedDate && v.proposedDate >= new Date())
    .sort((a, b) => a.proposedDate.getTime() - b.proposedDate.getTime())[0];
  const styles: string[] = JSON.parse(p.teachingStyles || "[]");
  return {
    id: p.id, teacherCode: p.teacherCode, name: p.fullName, initials: initials(p.fullName),
    style: styles[0] || "—", nextVisit: upcoming ? dateLabel(upcoming.proposedDate) : "—",
    status: p.status,
  };
}

function serializeProfile(p: any) {
  return {
    id: p.id, teacherCode: p.teacherCode, fullName: p.fullName, preferredName: p.preferredName,
    email: p.email, phone: p.phone, country: p.country, city: p.city,
    profilePhotoUrl: p.profilePhotoUrl, instagram: p.instagram, website: p.website, bio: p.bio,
    yearsExperience: p.yearsExperience, certification: p.certification, certificationSchool: p.certificationSchool,
    certificationLevel: p.certificationLevel, teachingStyles: JSON.parse(p.teachingStyles || "[]"),
    teachingSpecialties: p.teachingSpecialties, certificationFileUrl: p.certificationFileUrl,
    status: p.status, adminNotes: p.adminNotes,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeVisit(v: any) {
  return {
    id: v.id, visitType: v.visitType, status: v.status, title: v.title, description: v.description,
    proposedDate: v.proposedDate ? v.proposedDate.toISOString() : null,
    numberOfSessions: v.numberOfSessions, expectedStudents: v.expectedStudents,
    sessionDuration: v.sessionDuration, preferredTime: v.preferredTime,
    websiteIntro: v.websiteIntro, socialLinks: v.socialLinks, equipmentNeeds: v.equipmentNeeds,
    travelNotes: v.travelNotes, dietaryNeeds: v.dietaryNeeds, additionalComments: v.additionalComments,
    createdAt: v.createdAt.toISOString(),
    sessions: (v.sessions || []).map((s: any) => ({
      id: s.id, date: s.date ? s.date.toISOString() : null, startTime: s.startTime, endTime: s.endTime,
      className: s.className, yogaStyle: s.yogaStyle, duration: s.duration, capacity: s.capacity,
      bookingCount: s.bookingCount, status: s.status,
    })),
  };
}

adminTeachersRouter.get("/dashboard", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalTeachers = await db.teacherProfile.count();
  const pendingRegistrations = await db.teacherProfile.count({ where: { status: "pending" } });
  const upcomingTeachers = await db.teacherVisit.count({
    where: { status: { in: ["pending", "confirmed"] }, proposedDate: { gte: now } },
  });
  const thisMonth = await db.teacherProfile.count({ where: { createdAt: { gte: monthStart } } });
  const completedVisits = await db.teacherVisit.count({ where: { status: "completed" } });

  res.json({ totalTeachers, pendingRegistrations, upcomingTeachers, thisMonth, completedVisits });
});

adminTeachersRouter.get("/", async (req, res) => {
  const { status, q, style } = req.query as Record<string, string | undefined>;
  let profiles = await db.teacherProfile.findMany({ orderBy: { createdAt: "desc" } });
  if (status && status !== "All") profiles = profiles.filter((p) => p.status === status.toLowerCase());
  if (style) profiles = profiles.filter((p) => JSON.parse(p.teachingStyles || "[]").includes(style));
  if (q) {
    const needle = q.toLowerCase();
    profiles = profiles.filter((p) =>
      p.fullName.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle) ||
      p.teacherCode.toLowerCase().includes(needle) || p.country.toLowerCase().includes(needle));
  }
  const out = [];
  for (const p of profiles) {
    const visits = await db.teacherVisit.findMany({ where: { teacherProfileId: p.id } });
    out.push(serializeRow(p, visits));
  }
  res.json(out);
});

adminTeachersRouter.get("/:id", async (req, res) => {
  const profile = await db.teacherProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Teacher not found" });
  const visits = await db.teacherVisit.findMany({
    where: { teacherProfileId: profile.id }, orderBy: { createdAt: "desc" }, include: { sessions: true },
  });
  res.json({ profile: serializeProfile(profile), visits: visits.map(serializeVisit) });
});

adminTeachersRouter.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "approved", "active", "archived"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const profile = await db.teacherProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Teacher not found" });
  const updated = await db.teacherProfile.update({ where: { id: profile.id }, data: { status } });
  if (status === "approved" && profile.status !== "approved") {
    await db.teacherNotification.create({
      data: {
        teacherProfileId: profile.id, event: "approved", channel: "email",
        title: "Registration approved",
        body: "Your Sukahati Yoga teacher registration has been approved.",
      },
    });
  }
  await db.auditLog.create({
    data: {
      actorUserId: req.userId!, entityTable: "teacher_profiles", entityId: profile.id, action: "update",
      diff: JSON.stringify({ status, teacherName: profile.fullName }),
    },
  }).catch(() => {});
  res.json({ ok: true, status: updated.status });
});

adminTeachersRouter.patch("/:id/notes", async (req, res) => {
  const { notes } = req.body || {};
  const profile = await db.teacherProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Teacher not found" });
  await db.teacherProfile.update({ where: { id: profile.id }, data: { adminNotes: String(notes || "") } });
  await db.auditLog.create({
    data: {
      actorUserId: req.userId!, entityTable: "teacher_profiles", entityId: profile.id, action: "update",
      diff: JSON.stringify({ notesUpdated: true, teacherName: profile.fullName }),
    },
  }).catch(() => {});
  res.json({ ok: true });
});

adminTeachersRouter.patch("/visits/:visitId/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const visit = await db.teacherVisit.findUnique({ where: { id: req.params.visitId } });
  if (!visit) return res.status(404).json({ error: "Visit not found" });
  await db.teacherVisit.update({ where: { id: visit.id }, data: { status } });
  res.json({ ok: true, status });
});

adminTeachersRouter.delete("/visits/:visitId", async (req, res) => {
  const visit = await db.teacherVisit.findUnique({ where: { id: req.params.visitId } });
  if (!visit) return res.status(404).json({ error: "Visit not found" });
  await db.teacherSession.deleteMany({ where: { teacherVisitId: visit.id } });
  await db.teacherVisit.delete({ where: { id: visit.id } });
  res.json({ ok: true });
});

adminTeachersRouter.delete("/:id", async (req, res) => {
  const profile = await db.teacherProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Teacher not found" });
  await db.$transaction(async (tx) => {
    await tx.teacherSession.deleteMany({ where: { teacherProfileId: profile.id } });
    await tx.teacherVisit.deleteMany({ where: { teacherProfileId: profile.id } });
    await tx.teacherNotification.deleteMany({ where: { teacherProfileId: profile.id } });
    await tx.teacherProfile.delete({ where: { id: profile.id } });
    await tx.auditLog.create({
      data: { actorUserId: req.userId!, entityTable: "teacher_profiles", entityId: profile.id, action: "delete", diff: JSON.stringify({ teacherName: profile.fullName }) },
    });
  });
  res.json({ ok: true });
});

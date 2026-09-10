import { Router } from "express";
import { db } from "../db";
import { findExistingTeacherProfile, nextTeacherCode, normalizeEmail, normalizePhone } from "../domain/teacherRegistration";

export const teacherRegistrationRouter = Router();

function serializeProfile(p: any) {
  return {
    teacherCode: p.teacherCode, fullName: p.fullName, preferredName: p.preferredName,
    email: p.email, phone: p.phone, country: p.country, city: p.city,
    profilePhotoUrl: p.profilePhotoUrl, instagram: p.instagram, website: p.website, bio: p.bio,
    yearsExperience: p.yearsExperience, certification: p.certification, certificationSchool: p.certificationSchool,
    certificationLevel: p.certificationLevel, teachingStyles: JSON.parse(p.teachingStyles || "[]"),
    teachingSpecialties: p.teachingSpecialties, certificationFileUrl: p.certificationFileUrl,
    status: p.status, createdAt: p.createdAt.toISOString(),
  };
}

function serializeVisit(v: any) {
  return {
    id: v.id, visitType: v.visitType, status: v.status, title: v.title, description: v.description,
    proposedDate: v.proposedDate ? v.proposedDate.toISOString() : null,
    numberOfSessions: v.numberOfSessions, expectedStudents: v.expectedStudents,
    sessionDuration: v.sessionDuration, preferredTime: v.preferredTime, createdAt: v.createdAt.toISOString(),
    sessions: (v.sessions || []).map((s: any) => ({
      id: s.id, date: s.date ? s.date.toISOString() : null, startTime: s.startTime, endTime: s.endTime,
      className: s.className, yogaStyle: s.yogaStyle, duration: s.duration, capacity: s.capacity, status: s.status,
    })),
  };
}

// Called as the teacher fills in step 1, so the form can say "welcome back"
// before they've submitted anything.
teacherRegistrationRouter.post("/check-duplicate", async (req, res) => {
  const { email, phone } = req.body || {};
  if (!email && !phone) return res.json({ found: false });
  const existing = await findExistingTeacherProfile(email || "", phone || "");
  if (!existing) return res.json({ found: false });
  res.json({ found: true, teacherCode: existing.teacherCode, fullName: existing.fullName });
});

teacherRegistrationRouter.post("/submit", async (req, res) => {
  const { personal, teaching, visit, additional } = req.body || {};
  if (!personal?.fullName || !personal?.email || !personal?.phone) {
    return res.status(400).json({ error: "Full name, email and phone are required" });
  }
  if (!additional?.agreedToTerms) {
    return res.status(400).json({ error: "You must agree to the teacher terms and policies" });
  }
  const email = normalizeEmail(personal.email);
  const phone = normalizePhone(personal.phone);
  if (!phone) return res.status(400).json({ error: "A valid phone number is required" });

  const existing = await findExistingTeacherProfile(email, phone);
  let profile;
  const isReturning = !!existing;

  if (existing) {
    profile = await db.teacherProfile.update({
      where: { id: existing.id },
      data: {
        fullName: personal.fullName, preferredName: personal.preferredName || existing.preferredName,
        country: personal.country || existing.country, city: personal.city || existing.city,
        profilePhotoUrl: personal.profilePhotoUrl || existing.profilePhotoUrl,
        instagram: personal.instagram || existing.instagram, website: personal.website || existing.website,
        bio: teaching?.bio || existing.bio, yearsExperience: teaching?.yearsExperience || existing.yearsExperience,
        certification: teaching?.certification || existing.certification,
        certificationSchool: teaching?.certificationSchool || existing.certificationSchool,
        certificationLevel: teaching?.certificationLevel || existing.certificationLevel,
        teachingStyles: teaching?.yogaStyles?.length ? JSON.stringify(teaching.yogaStyles) : existing.teachingStyles,
        teachingSpecialties: teaching?.teachingSpecialties || existing.teachingSpecialties,
        certificationFileUrl: teaching?.certificationFileUrl || existing.certificationFileUrl,
      },
    });
  } else {
    const teacherCode = await nextTeacherCode();
    profile = await db.teacherProfile.create({
      data: {
        teacherCode, fullName: personal.fullName, preferredName: personal.preferredName || "",
        email, phone, country: personal.country || "", city: personal.city || "",
        profilePhotoUrl: personal.profilePhotoUrl || "", instagram: personal.instagram || "", website: personal.website || "",
        bio: teaching?.bio || "", yearsExperience: teaching?.yearsExperience || "",
        certification: teaching?.certification || "", certificationSchool: teaching?.certificationSchool || "",
        certificationLevel: teaching?.certificationLevel || "",
        teachingStyles: JSON.stringify(teaching?.yogaStyles || []),
        teachingSpecialties: teaching?.teachingSpecialties || "",
        certificationFileUrl: teaching?.certificationFileUrl || "",
      },
    });
  }

  const visitRow = await db.teacherVisit.create({
    data: {
      teacherProfileId: profile.id,
      visitType: visit?.visitType || "guest_teacher",
      title: visit?.title || "", description: visit?.description || "",
      proposedDate: visit?.proposedDate ? new Date(visit.proposedDate) : null,
      numberOfSessions: Number(visit?.numberOfSessions) || (Array.isArray(visit?.sessions) ? visit.sessions.length : 1) || 1,
      expectedStudents: visit?.expectedStudents ? Number(visit.expectedStudents) : null,
      sessionDuration: visit?.sessionDuration || "", preferredTime: visit?.preferredTime || "",
      websiteIntro: additional?.websiteIntro || "", socialLinks: additional?.socialLinks || "",
      equipmentNeeds: additional?.equipmentNeeds || "", travelNotes: additional?.travelNotes || "",
      dietaryNeeds: additional?.dietaryNeeds || "", additionalComments: additional?.additionalComments || "",
      agreedToTerms: true,
    },
  });

  const sessions = Array.isArray(visit?.sessions) ? visit.sessions : [];
  for (const s of sessions) {
    if (!s) continue;
    await db.teacherSession.create({
      data: {
        teacherVisitId: visitRow.id, teacherProfileId: profile.id,
        date: s.date ? new Date(s.date) : null, startTime: s.time || "", className: s.className || "",
        yogaStyle: s.style || "", duration: s.duration || "", capacity: Number(s.capacity) || 0,
      },
    });
  }

  await db.teacherNotification.create({
    data: {
      teacherProfileId: profile.id, event: "registration_received", channel: "email",
      title: "Registration received",
      body: `Thank you for registering with Sukahati Yoga. Your Teacher ID is ${profile.teacherCode}. Our team will review your details and contact you regarding your visit.`,
    },
  });

  res.status(201).json({ teacherCode: profile.teacherCode, teacherProfileId: profile.id, visitId: visitRow.id, isReturning });
});

// Lets a teacher revisit their own submission from the success screen.
// Requires the email they registered with as a lightweight access check —
// the Teacher ID alone isn't treated as a secret.
teacherRegistrationRouter.get("/:code", async (req, res) => {
  const email = normalizeEmail(String(req.query.email || ""));
  const profile = await db.teacherProfile.findUnique({ where: { teacherCode: req.params.code } });
  if (!profile || !email || profile.email !== email) return res.status(404).json({ error: "Registration not found" });
  const visits = await db.teacherVisit.findMany({
    where: { teacherProfileId: profile.id }, orderBy: { createdAt: "desc" }, include: { sessions: true },
  });
  res.json({ profile: serializeProfile(profile), visits: visits.map(serializeVisit) });
});

import { db } from "../db";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Keeps digits only, so "+60 12-345 6789" and "0123456789" compare equal.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function nextTeacherCode(): Promise<string> {
  const count = await db.teacherProfile.count();
  return "SY-T-" + String(count + 1).padStart(6, "0");
}

// Duplicate detection: an existing profile matches if either the email or
// the phone number matches — a returning teacher who visits again should
// get one profile with many visits, not a new profile each time.
export async function findExistingTeacherProfile(email: string, phone: string) {
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);
  const candidates = await db.teacherProfile.findMany({
    where: { OR: [{ email: normEmail }, ...(normPhone ? [{ phone: normPhone }] : [])] },
  });
  return candidates[0] || null;
}

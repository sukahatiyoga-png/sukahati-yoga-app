// "No conflicting assignment" rule: a teacher or room can't be on two
// overlapping sessions at once. Enforced here in application code (SQLite
// has no range-exclusion constraint), checked before every session
// create/reschedule.

import { db } from "../db";

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export async function assertNoConflict(opts: {
  teacherId: string;
  roomId: string;
  startsAt: Date;
  endsAt: Date;
  excludeSessionId?: string;
}) {
  const overlapping = await db.session.findMany({
    where: {
      id: opts.excludeSessionId ? { not: opts.excludeSessionId } : undefined,
      status: { not: "cancelled" },
      startsAt: { lt: opts.endsAt },
      endsAt: { gt: opts.startsAt },
      OR: [{ teacherId: opts.teacherId }, { roomId: opts.roomId }],
    },
    include: { teacher: true, room: true },
  });
  const teacherClash = overlapping.find((s) => s.teacherId === opts.teacherId);
  if (teacherClash) {
    throw new ConflictError(`${teacherClash.teacher.name} is already assigned to ${teacherClash.title} at that time`);
  }
  const roomClash = overlapping.find((s) => s.roomId === opts.roomId);
  if (roomClash) {
    throw new ConflictError(`${roomClash.room.name} is already booked for ${roomClash.title} at that time`);
  }
}

/** Live conflict report for the admin Resources screen — surfaces any
 * overlap that slipped in (e.g. from direct seed data) rather than only
 * preventing new ones. */
export async function findConflicts(): Promise<string[]> {
  const sessions = await db.session.findMany({
    where: { status: { not: "cancelled" } },
    include: { teacher: true, room: true },
    orderBy: { startsAt: "asc" },
  });
  const notes: string[] = [];
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (a.startsAt >= b.endsAt) continue;
      if (b.startsAt >= a.endsAt) continue;
      if (a.teacherId === b.teacherId) {
        notes.push(`${a.teacher.name} is assigned to ${a.title} and ${b.title} at once on ${a.startsAt.toDateString()}. Move one to save the schedule.`);
      } else if (a.roomId === b.roomId) {
        notes.push(`${a.room.name} is double-booked for ${a.title} and ${b.title} on ${a.startsAt.toDateString()}.`);
      }
    }
  }
  return notes;
}

// Seeds the database with the real studio catalog — packages, class
// schedule, teachers, rooms, coupons, automations — equivalent to the mock
// arrays in project/Sukahati Yoga App.dc.html, so every screen has real rows
// to read from day one. Customer accounts are created through real signup;
// this script only ever creates the one studio-owner account (from
// OWNER_EMAIL/OWNER_PASSWORD) and wipes any leftover demo accounts from
// earlier prototype runs.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { toMinor, genReferralCode } from "../src/domain/enums";

const db = new PrismaClient();

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function atTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

// Emails used by earlier prototype seeding. Safe to run on every deploy —
// once these accounts are gone this is a no-op.
const FAKE_EMAILS = [
  "amelia.tan@gmail.com", "owner@sukahati.studio", "priya.menon@example.com",
  "daniel.ooi@example.com", "rafael.costa@example.com", "jonas.weber@example.com",
  "sofia.lim@example.com", "nur.aisyah@example.com",
];

async function wipeFakePeople() {
  const fake = await db.user.findMany({ where: { email: { in: FAKE_EMAILS } }, select: { id: true } });
  if (fake.length === 0) return;
  const ids = fake.map((u) => u.id);
  await db.waitlistEntry.deleteMany({ where: { userId: { in: ids } } });
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
  await db.booking.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed ${ids.length} demo account(s) from earlier prototype runs.`);
}

async function ensureOwnerAccount() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) {
    console.log("OWNER_EMAIL/OWNER_PASSWORD not set — skipping studio-owner account setup.");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { email }, data: { passwordHash, role: "owner", authProvider: "email" } });
    console.log(`Studio-owner account ${email} updated.`);
  } else {
    await db.user.create({
      data: {
        fullName: "Sukahati Studio", email, passwordHash, authProvider: "email", role: "owner",
        referralCode: genReferralCode("Sukahati Studio"),
      },
    });
    console.log(`Studio-owner account ${email} created.`);
  }
}

async function main() {
  await wipeFakePeople();
  await ensureOwnerAccount();

  // Catalog seeding is idempotent: safe to run on every deploy. A fresh
  // empty database has no locations; a previously-seeded one does, so skip
  // rather than duplicate.
  const existing = await db.location.count();
  if (existing > 0) {
    console.log("Catalog already seeded — skipping.");
    return;
  }

  console.log("Seeding catalog…");

  // ── Locations ──────────────────────────────────────────────────────
  const studio = await db.location.create({
    data: { name: "Sukahati Yoga · Kuala Lumpur", kind: "studio", address: "Bangsar, Kuala Lumpur", timezone: "Asia/Kuala_Lumpur" },
  });
  const retreatSite = await db.location.create({
    data: { name: "Sukahati Retreat · Janda Baik", kind: "retreat", address: "Janda Baik, Pahang", timezone: "Asia/Kuala_Lumpur" },
  });

  // ── Teachers ───────────────────────────────────────────────────────
  const dewi = await db.teacher.create({ data: { name: "Dewi Anggraini", specialties: JSON.stringify(["Flow", "Yin"]), weeklyHourCap: 24 } });
  const ayu = await db.teacher.create({ data: { name: "Ayu Kartika", specialties: JSON.stringify(["Hatha", "Yin"]), weeklyHourCap: 20 } });
  const marcus = await db.teacher.create({ data: { name: "Marcus Teoh", specialties: JSON.stringify(["Private", "Retreat lead"]), weeklyHourCap: 16 } });

  // ── Rooms ──────────────────────────────────────────────────────────
  const studioA = await db.room.create({ data: { locationId: studio.id, name: "Studio A", matCapacity: 10, note: "street level" } });
  const studioB = await db.room.create({ data: { locationId: studio.id, name: "Studio B", matCapacity: 12, note: "candles allowed" } });
  const privateRoom = await db.room.create({ data: { locationId: studio.id, name: "Private room", matCapacity: 2, note: "1-to-1 only" } });
  const jandaBaikRooms = await db.room.create({ data: { locationId: retreatSite.id, name: "Janda Baik · 20 rooms", isAccommodation: true, beds: 20, note: "Retreat site" } });

  // ── Packages ───────────────────────────────────────────────────────
  const p1 = await db.package.create({
    data: {
      locationId: studio.id, name: "One Time Drop In", kind: "single", priceMinor: toMinor(50), billingUnit: "per class",
      capacityPerSession: 10, capacityLabel: "10 per class", cancellationHours: 12, cancelLabel: "Free up to 12h before",
      isVisible: true, isRecommended: false, sortOrder: 1, category: "Drop in", durationLabel: "60 min", ratingLabel: "4.9 ★",
      shortDescription: "A single class, any style on the schedule.", goodFor: "A first visit", validLabel: "Day of booking",
      longDescription: "One class, whenever it suits you. Pay online or at the studio — nothing to commit to.",
      inclusions: JSON.stringify(["One class of your choice", "Mat and props", "Filtered water and towel service"]),
      exclusions: JSON.stringify(["Parking", "Retail purchases", "Private sessions"]),
    },
  });
  const p2 = await db.package.create({
    data: {
      locationId: studio.id, name: "1 Week Class Pass", kind: "pass", priceMinor: toMinor(300), billingUnit: "7 days unlimited",
      validityDays: 7, capacityLabel: "Unlimited classes", cancellationHours: 12, cancelLabel: "Free up to 12h before",
      isVisible: true, isRecommended: true, badge: "Recommended for tourist", sortOrder: 2, category: "Pass", durationLabel: "7 days", ratingLabel: "5.0 ★",
      shortDescription: "Unlimited classes for seven days in a row.", goodFor: "Visitors and short stays", validLabel: "7 days from first class",
      longDescription: "Seven days of unlimited practice from your first class. The pass most visitors take.",
      inclusions: JSON.stringify(["Unlimited studio classes for 7 days", "Mat and props", "One guest pass"]),
      exclusions: JSON.stringify(["Private sessions", "Retreats", "Workshops"]),
    },
  });
  const p3 = await db.package.create({
    data: {
      locationId: studio.id, name: "Unlimited Monthly Pass", kind: "pass", priceMinor: toMinor(500), billingUnit: "30 days unlimited",
      validityDays: 30, capacityLabel: "Unlimited classes", cancellationHours: 12, cancelLabel: "Free up to 12h before",
      isVisible: true, sortOrder: 3, category: "Pass", durationLabel: "30 days", ratingLabel: "4.8 ★",
      shortDescription: "A full month of unlimited classes.", goodFor: "A regular practice", validLabel: "30 days from first class",
      longDescription: "Thirty days of unlimited classes, with priority booking on the evening sessions that fill first.",
      inclusions: JSON.stringify(["Unlimited studio classes for 30 days", "Priority booking", "Two guest passes", "10% off retail"]),
      exclusions: JSON.stringify(["Private sessions", "Retreat accommodation"]),
    },
  });
  const p4 = await db.package.create({
    data: {
      locationId: studio.id, name: "Private Yoga Session (1 - TO - 1)", kind: "private", priceMinor: toMinor(200), billingUnit: "per session",
      capacityLabel: "1 guest (2 on request)", maxGuestsPerBooking: 2, cancellationHours: 24, cancelLabel: "Free up to 24h before",
      isVisible: true, sortOrder: 4, category: "Private", durationLabel: "60 min", ratingLabel: "5.0 ★",
      shortDescription: "One teacher, one guest, one hour.", goodFor: "Injury care and beginners", validLabel: "Session booked",
      longDescription: "An hour built around you — injury care, a deeper practice, or a quiet start. Times are arranged with the teacher after your request.",
      inclusions: JSON.stringify(["One hour with a senior teacher", "Private studio", "A written practice plan"]),
      exclusions: JSON.stringify(["Group classes", "Room hire beyond the hour"]),
    },
  });
  const p5 = await db.package.create({
    data: {
      locationId: studio.id, name: "Live Online Yoga Sessions (Zoom)", kind: "online", priceMinor: toMinor(80), billingUnit: "per session",
      capacityLabel: "20 per session", capacityPerSession: 20, cancellationHours: 2, cancelLabel: "Free up to 2h before",
      isVisible: true, sortOrder: 5, category: "Online", durationLabel: "60 min", ratingLabel: "4.7 ★",
      shortDescription: "Practise with us from anywhere over Zoom.", goodFor: "Practising from abroad", validLabel: "Session booked",
      longDescription: "The same classes, joined live from home. Tell us your timezone in the notes and we will place you in a slot that works.",
      inclusions: JSON.stringify(["Live Zoom class", "48-hour replay link", "Props list emailed ahead"]),
      exclusions: JSON.stringify(["Studio access", "Mat hire"]),
    },
  });
  const p6 = await db.package.create({
    data: {
      locationId: retreatSite.id, name: "3-Day Retreat · Janda Baik", kind: "retreat", priceMinor: toMinor(1800), billingUnit: "per person, 10–12 Oct",
      capacityLabel: "12 guests · 20 rooms", cancellationHours: 336, cancelLabel: "50% refund up to 14 days before",
      isVisible: true, badge: "Early bird", sortOrder: 6, category: "Retreat", durationLabel: "3 days", ratingLabel: "5.0 ★",
      shortDescription: "Six sessions, a shared room and all meals in the hills.", goodFor: "A proper reset", validLabel: "10–12 October 2026",
      longDescription: "Three days away from the city: two practices a day, silent walks, and vegetarian meals cooked on site. Twelve places, four rooms left.",
      inclusions: JSON.stringify(["Two nights accommodation", "All meals", "Six guided sessions", "Return transfer from KL"]),
      exclusions: JSON.stringify(["Flights", "Massage treatments", "Optional hike guide"]),
    },
  });

  const today = new Date();
  const oct = new Date(today.getFullYear(), 9, 10);
  if (oct < today) oct.setFullYear(oct.getFullYear() + 1);
  const retreatStart = oct;
  const retreatEnd = new Date(oct);
  retreatEnd.setDate(retreatEnd.getDate() + 2);
  const earlyBird = new Date(retreatStart);
  earlyBird.setDate(earlyBird.getDate() - 20);

  const retreat = await db.retreat.create({
    data: {
      packageId: p6.id, locationId: retreatSite.id, startsOn: retreatStart, endsOn: retreatEnd,
      checkInAt: "14:00", checkOutAt: "11:00", totalPlaces: 12, earlyBirdUntil: earlyBird,
    },
  });

  // ── Class templates (recur daily) ─────────────────────────────────
  const tMorning = await db.classTemplate.create({ data: { locationId: studio.id, title: "Morning Flow", category: "Flow", level: "all levels", durationMinutes: 60, weekday: -1, startTime: "07:00", defaultTeacherId: dewi.id, defaultRoomId: studioA.id, capacity: 10, ratingLabel: "4.9 ★" } });
  const tHatha = await db.classTemplate.create({ data: { locationId: studio.id, title: "Gentle Hatha", category: "Hatha", level: "all levels", durationMinutes: 75, weekday: -1, startTime: "09:30", defaultTeacherId: ayu.id, defaultRoomId: studioA.id, capacity: 10, ratingLabel: "4.8 ★" } });
  const tSlow = await db.classTemplate.create({ data: { locationId: studio.id, title: "Slow Flow", category: "Flow", level: "intermediate", durationMinutes: 60, weekday: -1, startTime: "17:30", defaultTeacherId: dewi.id, defaultRoomId: studioB.id, capacity: 12, ratingLabel: "4.9 ★" } });
  const tYin = await db.classTemplate.create({ data: { locationId: studio.id, title: "Candlelight Yin", category: "Yin", level: "all levels", durationMinutes: 75, weekday: -1, startTime: "19:00", defaultTeacherId: ayu.id, defaultRoomId: studioB.id, capacity: 12, ratingLabel: "5.0 ★" } });

  // ── Sessions: 14 days starting yesterday, 4 slots/day ─────────────
  const templates = [tMorning, tHatha, tSlow, tYin];
  const base = startOfDay(today);
  base.setDate(base.getDate() - 1);
  for (let dayOffset = 0; dayOffset < 15; dayOffset++) {
    const day = new Date(base);
    day.setDate(day.getDate() + dayOffset);
    for (const t of templates) {
      const startsAt = atTime(day, t.startTime);
      const endsAt = new Date(startsAt.getTime() + t.durationMinutes * 60000);
      await db.session.create({
        data: {
          templateId: t.id, locationId: studio.id, title: t.title, startsAt, endsAt,
          teacherId: t.defaultTeacherId, roomId: t.defaultRoomId, capacity: t.capacity,
          seatsTaken: 0, status: "scheduled",
        },
      });
    }
  }

  // ── Addons ─────────────────────────────────────────────────────────
  const addonMat = await db.addon.create({ data: { name: "Mat and props hire", priceMinor: toMinor(5) } });
  const addonTowel = await db.addon.create({ data: { name: "Towel service", priceMinor: toMinor(3) } });
  const addonSmoothie = await db.addon.create({ data: { name: "Post-class smoothie", priceMinor: toMinor(12) } });
  void addonMat; void addonTowel; void addonSmoothie;

  // ── Coupons ────────────────────────────────────────────────────────
  const farFuture = new Date(today); farFuture.setFullYear(farFuture.getFullYear() + 1);
  const farPast = new Date(today); farPast.setMonth(farPast.getMonth() - 1);
  await db.coupon.create({ data: { code: "EARLYBIRD", discountType: "percent", discountValue: 10, appliesToPackageId: p6.id, startsAt: farPast, expiresAt: farFuture, maxRedemptions: 30, redemptionCount: 14, isActive: true, detailLabel: "10% off · retreat only · 14 used of 30" } });
  await db.coupon.create({ data: { code: "TOURIST300", discountType: "fixed", discountValue: toMinor(30), appliesToPackageId: p2.id, startsAt: farPast, expiresAt: farFuture, maxRedemptions: 200, redemptionCount: 6, isActive: true, detailLabel: "RM 30 off the week pass · 6 used" } });
  await db.coupon.create({ data: { code: "BRINGAFRIEND", discountType: "percent", discountValue: 50, startsAt: farPast, expiresAt: farFuture, maxRedemptions: 999, redemptionCount: 22, isActive: false, detailLabel: "Two for one, weekday mornings · 22 used" } });
  await db.coupon.create({ data: { code: "BIRTHDAY", discountType: "percent", discountValue: 100, startsAt: farPast, expiresAt: farFuture, maxRedemptions: 999999, redemptionCount: 0, isActive: true, detailLabel: "Free class in your birthday month · automatic" } });

  // ── Automations ────────────────────────────────────────────────────
  const automations = [
    { id: "m1", name: "Booking and payment confirmation", note: "Email and push, immediately", isActive: true },
    { id: "m2", name: "Reminder 7 days before", note: "Retreats and workshops only", isActive: true },
    { id: "m3", name: "Reminder 24 hours before", note: "Push, SMS fallback", isActive: true },
    { id: "m4", name: "Waitlist opening", note: "WhatsApp, one-hour hold", isActive: true },
    { id: "m5", name: "Abandoned booking nudge", note: "Email after 2 hours", isActive: false },
  ];
  for (let i = 0; i < automations.length; i++) {
    await db.automationSetting.create({ data: { ...automations[i], sortOrder: i } });
  }

  void marcus; void privateRoom; void jandaBaikRooms;
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => db.$disconnect());

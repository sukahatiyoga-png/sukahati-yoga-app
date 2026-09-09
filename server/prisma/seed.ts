// Seeds the database with data equivalent to the mock arrays in
// project/Sukahati Yoga App.dc.html (PKGS, SLOTS, ALERTS, ADDONS, TEACHERS,
// ROOMS, CUSTOMERS, ADMIN_BOOKINGS, COUPONS, AUTOMATIONS) so every screen in
// the app has real rows to read from day one.

import { PrismaClient } from "@prisma/client";
import { toMinor, genReference, genQrToken, genReferralCode } from "../src/domain/enums";

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

async function main() {
  // Idempotent: safe to run on every deploy. A fresh empty database has no
  // locations; a previously-seeded one does, so skip rather than duplicate.
  const existing = await db.location.count();
  if (existing > 0) {
    console.log("Already seeded — skipping.");
    return;
  }

  console.log("Seeding…");

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

  // ── Users ──────────────────────────────────────────────────────────
  const amelia = await db.user.create({
    data: {
      fullName: "Amelia Tan", email: "amelia.tan@gmail.com", phoneE164: "+6012 442 8871",
      authProvider: "google", role: "customer", loyaltyPoints: 340, referralCode: "AMELIA25",
      preferences: {
        create: {
          usualLevel: "Beginner", preferredTime: "Mornings", mealPreference: "Vegetarian",
          pushEnabled: true, emailEnabled: true, whatsappEnabled: true, smsEnabled: false,
        },
      },
    },
  });
  const owner = await db.user.create({
    data: { fullName: "Sukahati Owner", email: "owner@sukahati.studio", authProvider: "email", role: "owner", referralCode: genReferralCode("Owner Admin") },
  });
  const [priya, daniel, rafael, jonas, sofia, nur] = await Promise.all([
    db.user.create({ data: { fullName: "Priya Menon", email: "priya.menon@example.com", authProvider: "email", role: "customer", referralCode: genReferralCode("Priya Menon") } }),
    db.user.create({ data: { fullName: "Daniel Ooi", email: "daniel.ooi@example.com", authProvider: "email", role: "customer", referralCode: genReferralCode("Daniel Ooi") } }),
    db.user.create({ data: { fullName: "Rafael Costa", email: "rafael.costa@example.com", authProvider: "email", role: "customer", referralCode: genReferralCode("Rafael Costa") } }),
    db.user.create({ data: { fullName: "Jonas Weber", email: "jonas.weber@example.com", authProvider: "email", role: "customer", referralCode: genReferralCode("Jonas Weber") } }),
    db.user.create({ data: { fullName: "Sofia Lim", email: "sofia.lim@example.com", authProvider: "email", role: "customer", referralCode: genReferralCode("Sofia Lim") } }),
    db.user.create({ data: { fullName: "Nur Aisyah Rahman", email: "nur.aisyah@example.com", authProvider: "email", role: "customer", referralCode: genReferralCode("Nur Aisyah Rahman") } }),
  ]);

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
  const sessionsByKey = new Map<string, { id: string }>();
  const base = startOfDay(today);
  base.setDate(base.getDate() - 1);
  for (let dayOffset = 0; dayOffset < 15; dayOffset++) {
    const day = new Date(base);
    day.setDate(day.getDate() + dayOffset);
    for (const t of templates) {
      const startsAt = atTime(day, t.startTime);
      const endsAt = new Date(startsAt.getTime() + t.durationMinutes * 60000);
      // Same fill pattern the prototype used for "today", varied a little per day so the
      // week doesn't look identical: Morning 4 left, Hatha 6 left, Slow Flow full, Yin 2 left.
      const spotsPattern: Record<string, number> = {
        [tMorning.id]: 4, [tHatha.id]: 6, [tSlow.id]: 0, [tYin.id]: 2,
      };
      const spotsLeft = Math.max(0, spotsPattern[t.id] - (dayOffset % 3 === 0 ? 1 : 0));
      const seatsTaken = t.capacity - spotsLeft;
      const s = await db.session.create({
        data: {
          templateId: t.id, locationId: studio.id, title: t.title, startsAt, endsAt,
          teacherId: t.defaultTeacherId, roomId: t.defaultRoomId, capacity: t.capacity,
          seatsTaken, status: seatsTaken >= t.capacity ? "full" : "scheduled",
        },
      });
      sessionsByKey.set(`${dayOffset}:${t.id}`, s);
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

  // ── Helper to create a paid/pending booking ───────────────────────
  async function makeBooking(opts: {
    user: { id: string }; pkg: { id: string; priceMinor: number; currency: string };
    session?: { id: string } | null; retreatId?: string | null; guestCount: number;
    level?: string; specialRequests?: string; status: string; paidMinor: number; totalMinor?: number;
    createdDaysAgo?: number; checkedIn?: boolean;
  }) {
    const total = opts.totalMinor ?? opts.pkg.priceMinor * opts.guestCount;
    const createdAt = new Date(today);
    if (opts.createdDaysAgo) createdAt.setDate(createdAt.getDate() - opts.createdDaysAgo);
    const booking = await db.booking.create({
      data: {
        reference: genReference(), userId: opts.user.id, packageId: opts.pkg.id,
        sessionId: opts.session?.id ?? null, retreatId: opts.retreatId ?? null,
        guestCount: opts.guestCount, level: opts.level ?? "Beginner", specialRequests: opts.specialRequests ?? "",
        status: opts.status, subtotalMinor: total, totalMinor: total, amountPaidMinor: opts.paidMinor,
        currency: opts.pkg.currency, qrToken: genQrToken(), createdAt,
        checkedInAt: opts.checkedIn ? createdAt : null,
      },
    });
    if (opts.paidMinor > 0) {
      await db.payment.create({
        data: { bookingId: booking.id, kind: "full", method: "card", amountMinor: opts.paidMinor, status: "paid", paidAt: createdAt, currency: opts.pkg.currency },
      });
    }
    if (opts.session) {
      // seatsTaken already reflects the seed pattern above; no extra increment needed here.
    }
    if (opts.retreatId && ["pending", "confirmed", "attended"].includes(opts.status)) {
      await db.retreat.update({ where: { id: opts.retreatId }, data: { placesTaken: { increment: opts.guestCount } } });
    }
    return booking;
  }

  // Amelia — upcoming: Morning Flow today/tomorrow (dayOffset 2 = "tomorrow" from base which started yesterday)
  const ameliaSession = sessionsByKey.get(`2:${tMorning.id}`)!;
  await makeBooking({ user: amelia, pkg: p2, session: ameliaSession, guestCount: 1, status: "confirmed", paidMinor: p2.priceMinor, createdDaysAgo: 3 });
  await makeBooking({ user: amelia, pkg: p6, retreatId: retreat.id, guestCount: 1, specialRequests: "vegetarian, shared room", status: "confirmed", paidMinor: p6.priceMinor - toMinor(900), totalMinor: p6.priceMinor, createdDaysAgo: 5 });
  // Amelia — past, attended
  const pastYin = sessionsByKey.get(`0:${tYin.id}`)!;
  const pastMorning = sessionsByKey.get(`0:${tMorning.id}`)!;
  await makeBooking({ user: amelia, pkg: p1, session: pastYin, guestCount: 1, status: "attended", paidMinor: p1.priceMinor, createdDaysAgo: 2, checkedIn: true });
  await makeBooking({ user: amelia, pkg: p1, session: pastMorning, guestCount: 1, status: "attended", paidMinor: p1.priceMinor, createdDaysAgo: 3, checkedIn: true });

  // Admin bookings from other guests
  const rafaelSlot = sessionsByKey.get(`2:${tSlow.id}`)!;
  await makeBooking({ user: rafael, pkg: p4, session: rafaelSlot, guestCount: 1, status: "pending", paidMinor: 0, totalMinor: p4.priceMinor, createdDaysAgo: 1 });

  const jonasSlot = sessionsByKey.get(`4:${tHatha.id}`)!;
  await makeBooking({ user: jonas, pkg: p5, session: jonasSlot, guestCount: 1, specialRequests: "CET timezone", status: "pending", paidMinor: p5.priceMinor, totalMinor: p5.priceMinor, createdDaysAgo: 1 });

  const nurSlot = sessionsByKey.get(`3:${tYin.id}`)!;
  await makeBooking({ user: nur, pkg: p3, session: nurSlot, guestCount: 2, status: "confirmed", paidMinor: p3.priceMinor, totalMinor: p3.priceMinor, createdDaysAgo: 2 });

  await makeBooking({ user: sofia, pkg: p6, retreatId: retreat.id, guestCount: 1, status: "confirmed", paidMinor: 0, totalMinor: toMinor(900), createdDaysAgo: 4 });

  // A little history for Priya and Daniel (monthly members) so Customers screen has real spend
  const priyaSlot = sessionsByKey.get(`1:${tHatha.id}`)!;
  await makeBooking({ user: priya, pkg: p3, session: priyaSlot, guestCount: 1, status: "attended", paidMinor: p3.priceMinor, createdDaysAgo: 20, checkedIn: true });
  const danielSlot = sessionsByKey.get(`1:${tMorning.id}`)!;
  await makeBooking({ user: daniel, pkg: p3, session: danielSlot, guestCount: 1, status: "attended", paidMinor: p3.priceMinor, createdDaysAgo: 18, checkedIn: true });

  // Today's check-in board: a couple more bookings on today's Hatha class
  const todayHatha = sessionsByKey.get(`1:${tHatha.id}`)!;
  await makeBooking({ user: priya, pkg: p3, session: todayHatha, guestCount: 1, status: "confirmed", paidMinor: 0, totalMinor: 0, checkedIn: true });
  await makeBooking({ user: daniel, pkg: p3, session: todayHatha, guestCount: 1, status: "confirmed", paidMinor: 0, totalMinor: 0 });
  const todayYin = sessionsByKey.get(`1:${tYin.id}`)!;
  await makeBooking({ user: amelia, pkg: p2, session: todayYin, guestCount: 1, status: "confirmed", paidMinor: 0, totalMinor: 0 });
  await makeBooking({ user: sofia, pkg: p1, session: todayYin, guestCount: 1, status: "confirmed", paidMinor: p1.priceMinor, totalMinor: p1.priceMinor });

  // Waitlist on the perpetually-full Slow Flow session today
  const todaySlow = sessionsByKey.get(`1:${tSlow.id}`)!;
  const waiters = [priya, daniel, rafael, jonas, sofia];
  for (let i = 0; i < waiters.length; i++) {
    await db.waitlistEntry.create({ data: { sessionId: todaySlow.id, userId: waiters[i].id, position: i + 1 } });
  }

  // ── Notifications for Amelia ──────────────────────────────────────
  const notifDefs = [
    { event: "booking_confirmed", channel: "push", title: "Booking confirmed", body: "Morning Flow, Wednesday 9 September at 7:00 AM. Dewi will see you there.", agoMin: 18, read: false },
    { event: "payment_received", channel: "email", title: "Payment received", body: "RM 300.00 for 1 Week Class Pass. Receipt sent to amelia.tan@gmail.com.", agoMin: 20, read: false },
    { event: "payment_due", channel: "push", title: "Your pass ends Sunday", body: "1 Week Class Pass — 3 days left. Renew any time to keep your place in the morning classes.", agoMin: 120, read: false },
    { event: "waitlist_open", channel: "whatsapp", title: "A place opened up", body: "Slow Flow, today 5:30 PM. You were second on the waitlist — hold it within the hour.", agoMin: 180, read: true },
    { event: "reminder_24h", channel: "sms", title: "Candlelight Yin in 24 hours", body: "Doors open at 6:45 PM. Studio B, second floor. Reply CANCEL to release your place.", agoMin: 300, read: true },
    { event: "schedule_changed", channel: "email", title: "October retreat is open", body: "Three days in Janda Baik, 10–12 October. Early-bird price until 20 September.", agoMin: 1440, read: true },
  ];
  for (const n of notifDefs) {
    const sentAt = new Date(today.getTime() - n.agoMin * 60000);
    await db.notification.create({
      data: {
        userId: amelia.id, event: n.event, channel: n.channel, title: n.title, body: n.body,
        scheduledFor: sentAt, sentAt, readAt: n.read ? sentAt : null,
      },
    });
  }

  void owner;
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => db.$disconnect());

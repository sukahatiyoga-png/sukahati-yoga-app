# Sukahati Yoga — server

Express + Prisma + Postgres API backing the Sukahati Yoga booking app. Schema follows
`project/Data Model.dc.html` (15 tables across people, catalogue, booking engine, money and
operations, plus a few display-copy columns and one small `AutomationSetting` table — see the
header comment in `prisma/schema.prisma` for what was added and why).

## Run

```
npm install
cp .env.example .env        # fill in DATABASE_URL from your Postgres provider (e.g. Supabase)
npx prisma db push          # sync the schema to the database
npm run seed                # seed packages, sessions, teachers, bookings, notifications, ...
                             # (idempotent — safe to re-run, it skips if already seeded)
npm run dev                 # start the API on :4000
```

## Rules enforced in application code

- **No double booking** — `POST /api/bookings` re-checks session/retreat capacity inside the same
  `$transaction` that increments `seatsTaken`/`placesTaken` (`src/routes/bookings.ts`).
- **No conflicting assignment** — `src/domain/scheduling.ts` checks for overlapping
  teacher/room time ranges before a session is created; `GET /api/admin/conflicts` reports any
  that exist.
- **Money in minor units** — every amount is stored as an integer (`priceMinor`, `amountMinor`, ...);
  see `src/domain/enums.ts` for the `toMinor`/`formatMoney` helpers.
- **Payments are append-only** — refunds insert a new negative `Payment` row rather than editing one;
  `recomputeAmountPaid` (`src/domain/pricing.ts`) derives a booking's paid total from its payment rows.
- **Notifications are scheduled, not fired** — `Notification` rows carry `scheduledFor`/`sentAt`.
- **Soft delete for people** — `User.deletedAt`.

## Structure

- `prisma/schema.prisma` — data model; `prisma/seed.ts` — seed data equivalent to the prototype's mocks
- `src/routes/` — one file per resource area (packages, sessions, bookings, notifications, users, admin)
- `src/domain/` — pricing, scheduling/conflict checks, formatting, shared enums

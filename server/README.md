# Sukahati Yoga — server

Express + Prisma + Postgres API backing the Sukahati Yoga booking app. Schema follows
`project/Data Model.dc.html` (15 tables across people, catalogue, booking engine, money and
operations, plus a few display-copy columns and one small `AutomationSetting` table — see the
header comment in `prisma/schema.prisma` for what was added and why).

## Run

```
npm install
cp .env.example .env        # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET, OWNER_EMAIL, OWNER_PASSWORD
npx prisma db push          # sync the schema to the database
npm run seed                # seed packages, sessions, teachers, coupons, ... and the owner account
                             # (idempotent — safe to re-run on every deploy)
npm run dev                 # start the API on :4000
```

### Accounts

There are no seeded customer accounts — customers sign up for real from the app (`POST
/api/auth/signup`, email + password). The seed script only ever creates one studio-staff
account, from `OWNER_EMAIL`/`OWNER_PASSWORD`; sign in with those at `/admin` to reach the studio
dashboard. `JWT_SECRET` signs login tokens — set it to a long random string in production (e.g.
`openssl rand -hex 32`).

### Two connection strings, on purpose

Supabase (and similar hosted Postgres) gives you a **pooled** connection (PgBouncer,
typically port 6543) and a **direct** one (port 5432). `DATABASE_URL` (pooled) is what the
running app uses for normal queries. `DIRECT_URL` (unpooled) is what `prisma db push` /
`migrate` need — schema changes take a session-level advisory lock that PgBouncer's
transaction-pooling mode doesn't support, so running them against the pooled URL just hangs
indefinitely. Both are required; see `.env.example`.

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

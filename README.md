# BWW Job Queue

Production job-queue dashboard for **Ballard Water Well / Texas Water Well**.

This replaces the dead Manus app at `https://bwwjobdash-h6h6uzmx.manus.space/`. Workiz Easy Live Sync no longer crashes when `Tags` is a string.

## Why the old sync broke

Workiz often returns `Tags` as a string (or a keyed object), not an array. The previous app did `(job.Tags ?? []).map(...)`, which throws `map is not a function` and stops the whole pull.

Every tag read now goes through `asTagList()` in `src/lib/asTagList.ts`. Never use `(job.Tags ?? []).map`.

## What v1 includes

- Public dark dashboard of **active rigs** and their queued jobs
- Admin password / signed-session auth
- Jobs CRUD, reorder within a rig, assign rig + supervisor
- Workiz Easy Live Sync: pull open jobs, map tag or supervisor name → rig, upsert by Workiz id, **keep admin queue positions**
- Admin: Ping Workiz, Run sync now, mappings CRUD, sync status
- Vercel Cron every 15 minutes, gated by `CRON_SECRET`

## Stack

Next.js App Router, TypeScript, Tailwind, Drizzle ORM, Neon Postgres. Vercel-ready.

## Environment

Copy `.env.example` to `.env.local`. Do not commit secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon / Postgres connection string |
| `ADMIN_PASSWORD` | yes | Shared password for `/login` |
| `AUTH_SECRET` | yes | Signs the admin session cookie (32+ random chars) |
| `WORKIZ_API_TOKEN` | for sync | Workiz Developer API token (path token) |
| `WORKIZ_AUTH_SECRET` | no | Paired Workiz API secret. **Not** sent on list/ping unless `WORKIZ_API_MODE=easy`. `?secret=` is Easy API / Zapier style and is the leading HTTP 400 hypothesis on Developer API `/job/all/`. |
| `WORKIZ_API_MODE` | no | Default `developer`. Set `easy` to append `secret=WORKIZ_AUTH_SECRET`. |
| `WORKIZ_LOOKBACK_DAYS` | no | `start_date` lookback in days (default **730**, ~2 years). Workiz defaults to 14 days if `start_date` is omitted. |
| `CRON_SECRET` | for cron | Bearer token for `GET /api/cron/sync` |

## Local development

```bash
npm install
cp .env.example .env.local
# fill in Neon + admin secrets
npm run dev
```

Open `http://localhost:3000` for the public board and `/login` for admin.

Without `DATABASE_URL` the public board renders a labeled preview so you can judge layout. It is not live data.

Schema tables and sample rigs (`Rig 1`–`Rig 3`, `Pump Truck`, `Service`) are created automatically on first database connection.

```bash
npm test
npm run build
```

## Deploy on Vercel

1. Import `sambww/bww-job-queue`.
2. Set the env vars above on the project.
3. Deploy. First request against the database creates tables and seeds rigs.
4. `vercel.json` registers `GET /api/cron/sync` every 15 minutes. Vercel sends `Authorization: Bearer $CRON_SECRET`.

## Workiz mapping

1. In admin → **Mappings**, add a `tag` or `supervisor` match that points at a rig.
2. Click **Ping Workiz**, then **Run sync now**.
3. Open jobs upsert by Workiz UUID / id. New jobs append to the mapped rig queue. Existing jobs refresh customer/address/status fields and **do not change `queuePosition`**. If a job already has a rig assigned by an admin, sync will not steal it.

Workiz list call: `GET https://api.workiz.com/api/v1/{WORKIZ_API_TOKEN}/job/all/?records=100&offset=0&only_open=true&start_date=yyyy-MM-dd` (~2y lookback). Cron is `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`. `secret=` is appended only when `WORKIZ_API_MODE=easy`.

## Job fields

`id`, `jobCode`, `workizId`, `rigId`, `supervisorId`, `customerName`, `address`, `jobType`, `description`, `estimatedStartDate`, `status`, `queuePosition`, `customerEmail`, `customerPhone`, `customerNotifyOptIn`, `createdAt`, `updatedAt`, `supervisorName`.

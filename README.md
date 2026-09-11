# ByteCode EMS

Employee Management System for the ByteCode platform: attendance, task management, end-of-day (EOD) and weekly reports, and admin management, built on Next.js, Express, and Supabase. Companion Android app: [`bytecode-ems-mobile`](https://github.com/iamsrishanth/bytecode-ems-mobile).

## Tech Stack

- **Next.js** (App Router, server components/actions) + **React 19** + TypeScript
- **Supabase** — Postgres, Auth, and Row Level Security (`supabase/migrations/002_rls.sql`)
- **Express** backend layer per the project description
- Tailwind CSS v4, shadcn-style UI components, Recharts, Zod validation, date-fns
- Deployed on **Vercel** (framework pinned in `vercel.json`)

## Modules

- **Auth** — login and first-run setup (`src/app/(auth)`), session handling via `@supabase/ssr` middleware (`src/middleware.ts`) which guards `/dashboard`, `/attendance`, `/tasks`, `/reports`, `/admin`, etc. and redirects unauthenticated users to `/login`
- **Attendance** — check-in/check-out tracking (`attendance` table, components in `src/components/attendance`)
- **Tasks** — task assignment and management (`task` table)
- **Reports** — EOD reports and weekly rollups (`eod_report`, `weekly_report`, `daily_metrics` tables), plus CSV export at `/api/export`
- **Admin** — user and department management (`app_user`, `department` tables)
- **Cron jobs** — `/api/cron/eod-cutoff` (12:30 UTC Mon–Sat) and `/api/cron/weekly-rollup` (12:30 UTC Saturdays) scheduled in `vercel.json`, authenticated via a `CRON_SECRET` header check in middleware
- **Audit log** — action auditing (`audit_log` table, `src/lib/audit.ts`)

## Database (Supabase)

Migrations in `supabase/migrations/`:
- `001_schema.sql` — `department`, `app_user`, `task`, `attendance`, `eod_report`, `weekly_report`, `daily_metrics`, `audit_log`
- `002_rls.sql` — row level security policies
- `003_seed.sql` — seed data
- `004_cron.sql` — scheduled jobs

## Getting Started

```bash
npm install
cp .env.example .env.local   # configure Supabase URL and keys
npm run dev                  # http://localhost:3000
npm run build                # production build
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/        # login, setup
│   ├── (app)/         # dashboard, attendance, tasks, reports, admin
│   └── api/           # cron endpoints, export
├── components/        # attendance/, dashboard/, reports/, tasks/, layout/, ui/
├── lib/               # auth, db, supabase clients, validations, audit
└── middleware.ts      # session + route guarding + cron auth
supabase/migrations/   # schema, RLS, seed, cron
```

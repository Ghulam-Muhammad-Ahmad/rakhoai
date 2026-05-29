# AGENTS.md

This file provides guidance to Codex and other coding agents when working in this repository.

---

## Project

**RakhoAI (RetainIQ)** is a B2B SaaS for AI-powered student retention analytics. Tutoring businesses upload messy spreadsheet data; the system predicts which students are likely to churn 14-21 days early.

The repository now contains an initialized Next.js app with Supabase Auth/DB, upload parsing, auto column mapping, reusable mapping templates, risk scoring foundations, and dashboard routes.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router, TypeScript, Tailwind CSS |
| Backend | Next.js API Route Handlers, server components, Node.js |
| File parsing | SheetJS (`xlsx`) for Excel, Papaparse for CSV |
| Fuzzy matching | `fuse.js` |
| AI | OpenAI SDK for column mapping and risk scoring |
| DB client | Supabase JS client (`@supabase/supabase-js`) |
| DB | PostgreSQL via Supabase |
| DB types | Supabase CLI generated TypeScript types |
| Auth | Supabase Auth: email/password and Google OAuth |
| Storage | Supabase Storage |
| Hosting | Vercel + Supabase |

---

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build
npm run lint       # ESLint
npm run test:scoring

npx supabase db push
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```

Do not run Prisma commands. Prisma is no longer part of this codebase.

---

## Folder Structure

```
src/
  app/
    (auth)/login, (auth)/signup
    (dashboard)/dashboard, (dashboard)/students/[id], (dashboard)/uploads/[id]/map
    api/academy, api/uploads, api/dashboard
    auth/callback
    onboarding
  components/
    ui
    mapping
    dashboard
  lib/
    db          # Supabase service-role client, auth DB helpers, generated DB types
    ai          # OpenAI SDK wrapper and usage logging
    parsers     # Excel/CSV parsing
    matching    # 3-layer column mapping logic
    scoring     # rule-based and AI scoring pipeline
    supabase    # Supabase SSR/browser auth clients
supabase/
  migrations    # SQL migrations with RLS policies
tests/
```

---

## Core Architecture

### Stage 1 - Upload
- Accept `.csv`, `.xlsx`, `.xls`.
- Parse with SheetJS/Papaparse.
- Store upload metadata, headers, sample rows, raw rows, and storage path in Supabase.

### Stage 2 - Column Mapping
Internal schema fields: `student_name`, `contact_info`, `join_date`, `last_session_date`, `attendance_rate`, `last_payment_date`, `payment_status`, `total_sessions`, `fees_amount`, `subject`, `tutor_assigned`, `notes`.

Mapping runs through:
1. Exact match with aliases and normalization.
2. Fuzzy match with `fuse.js`.
3. AI semantic match with OpenAI for unmatched columns.

Users can override mappings and save reusable templates in `ColumnMapping`.

### Stage 3 - Risk Scoring
- Rule-based pre-score uses session recency, attendance, payment status, and tutor assignment.
- AI layer batches students and returns risk score, reasons, recommended action, and confidence.
- Usage is logged through `AiUsageLog`.

### Stage 4 - Dashboard
- Summary cards: total students, high/medium-risk counts, revenue at risk, students saved.
- At-risk list and intervention workflows build on `Student`, `RiskAssessment`, and `Action`.

---

## Database

Key tables:

`auth.users` -> `Academy` -> `Upload` -> `Student` -> `RiskAssessment` + `Action`

`ColumnMapping` stores reusable mapping templates as JSON per academy. `AiUsageLog` stores privacy-safe AI usage metadata.

Multi-tenant scoping is academy-based. `Academy.ownerId` stores the Supabase Auth user id from `auth.users.id`; there is no public application `User` table.

### Migration Security Requirements

- Migrations live in `supabase/migrations/` as plain SQL files.
- Include RLS policies in the same migration as table creation.
- Enable RLS with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Add owner-scoped policies for `SELECT`, `INSERT`, and `UPDATE` at minimum.
- Policies must scope access through the academy/user ownership chain and Supabase `auth.uid()`.
- Apply migrations with `npx supabase db push`.
- Regenerate DB types after schema changes with:

```bash
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```

---

## Constraints

- Do not reintroduce Prisma.
- Do not import `@prisma/*` packages or `src/generated/prisma`.
- Server-side DB access should use `src/lib/db/client.ts` and helpers in `src/lib/db/`.
- Client components may use Supabase only for auth/session behavior, not direct application-table reads or writes.
- Keep F3/F4/F5/F6 API contracts stable.
- Use Tailwind CSS utility classes for React UI styling. Avoid inline `style` attributes except for truly dynamic runtime values that cannot be expressed cleanly with Tailwind.

---

## MVP Scope

Build only: auth, single academy, CSV upload, 3-layer mapping, AI scoring, dashboard + at-risk list, student detail, mark action taken, email alerts, Stripe billing.

Not in MVP: WhatsApp, multi-academy, tutor scoring, LMS integrations, mobile, PDF export, team roles.

---

## Brand Colors

| Role | Hex |
|---|---|
| Primary (Deep Teal) | `#0F766E` |
| Accent (Warm Saffron) | `#F59E0B` |
| High Risk (Coral Red) | `#DC2626` |
| Success / Saved (Emerald) | `#10B981` |
| Text (Charcoal) | `#1F2937` |
| Background light | `#FAFAF7` |

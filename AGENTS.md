# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

## Project

**RakhoAI (RetainIQ)** — B2B SaaS for AI-powered student retention analytics. Tutoring businesses upload messy spreadsheet data; the system predicts which students will churn 14–21 days early.

No code exists yet. This repo contains specs only: `PRD.md` (full product requirements) and `Colorscheme.md` (brand palette).

---

## Tech Stack (Planned)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, TanStack Table, React Dropzone |
| Backend | Next.js API Route Handlers, Node.js |
| File parsing | SheetJS (`xlsx`) for Excel, Papaparse for CSV |
| Fuzzy matching | `string-similarity` or `fuse.js` |
| AI | OpenAI SDK (column mapping + risk scoring) |
| ORM | Prisma |
| DB | PostgreSQL via Supabase or Neon |
| Cache | Redis via Upstash (AI result cache, 24h TTL) |
| Auth | Auth.js v5 (NextAuth) — email + Google OAuth |
| Storage | Supabase Storage or S3 (uploaded files, 90-day retention) |
| Payments | Stripe |
| Hosting | Vercel + Supabase |
| Monitoring | Sentry, PostHog, Vercel Analytics |

---

## Commands (once initialized)

```bash
npm run dev        # local dev server
npm run build      # production build
npm run lint       # ESLint
npx prisma migrate dev    # run DB migrations
npx prisma studio         # browse DB
```

---

## Planned Folder Structure

```
/app
  /(auth)/login, /signup
  /(dashboard)/dashboard, /students/[id], /uploads/[id]/map, /settings
  /api/auth, /uploads, /students, /actions, /dashboard, /billing
/components
  /ui          ← shadcn primitives
  /upload
  /mapping
  /dashboard
  /charts
/lib
  /db          ← Prisma client singleton
  /ai          ← OpenAI SDK wrapper
  /parsers     ← Excel/CSV parsing
  /matching    ← 3-layer column mapping logic
  /scoring     ← rule-based pre-score
  /auth
/prisma
  schema.prisma
```

---

## Core Architecture: The 4-Stage Pipeline

### Stage 1 — Upload
- Accept `.csv`, `.xlsx`, `.xls` (max 10 MB)
- Parse with SheetJS/Papaparse; extract headers + first 5 rows for preview
- Handle: multi-sheet Excel (user picks), merged cells (flatten + warn), encoding issues, headerless files

### Stage 2 — Column Mapping (3 layers)
Internal schema fields: `student_name`, `contact_info`, `join_date`, `last_session_date`, `attendance_rate`, `last_payment_date`, `payment_status`, `total_sessions`, `fees_amount`, `subject`, `tutor_assigned`, `notes`

1. **Exact match** (confidence 1.0) — lowercase + strip spaces
2. **Fuzzy match** (confidence 0.6–0.95) — auto-accept if score > 0.75
3. **AI semantic match** (confidence 0.5–0.9) — send column name + 3 sample values to OpenAI; only for columns layers 1 & 2 miss

User can override any mapping via dropdown; save as reusable template.

### Stage 3 — Risk Scoring
- **Rule-based pre-score** (fast/cheap): days-since-last-session, attendance drop, payment overdue, no tutor
- **AI layer**: batch 10–20 students per OpenAI call → `risk_score` (0–100), `reasons[]`, `recommended_action`, `confidence`
- Cache results 24h in Redis; re-run only on new upload

### Stage 4 — Dashboard
- Summary cards: total students, high/medium-risk counts, revenue at risk, students saved
- At-risk table: sortable by score, filterable by band/tutor/subject
- Action statuses: Pending / In Progress / Done / Student Saved / Student Lost

---

## Database Schema (Key Tables)

`users` → `academies` (one per user in MVP) → `uploads` → `students` → `risk_assessments` + `actions`

`column_mappings` stores reusable mapping templates as JSON per academy.

Multi-tenant: every table has `academy_id` FK. No single-tenant isolation.

---

## MVP Scope

Build only: auth, single academy, CSV upload, 3-layer mapping, AI scoring, dashboard + at-risk list, student detail, mark action taken, email alerts, Stripe billing ($49/month plan).

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

---

## Key Design Decisions (from PRD)

- **Student deduplication**: match on `contact_info` first, then fuzzy name match; let user merge manually
- **Raw files**: store 90 days then auto-delete
- **AI cost control**: cache aggressively, use cheaper models for low-risk students
- **No real-time**: batch processing on upload is sufficient for MVP
- **Free trial**: no credit card required, 14-day limit, 50 students max

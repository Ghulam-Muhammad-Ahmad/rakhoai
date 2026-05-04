# RakhoAI

AI-powered student retention analytics for tutoring businesses.

Upload messy spreadsheet data, map columns into a standard student schema, score churn risk, and prioritize interventions before students leave.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript |
| Styling | Tailwind CSS |
| Auth | Supabase Auth: email/password and Google OAuth |
| Database | PostgreSQL via Supabase |
| DB client | Supabase JS client (`@supabase/supabase-js`) |
| DB types | Supabase CLI generated TypeScript types |
| Storage | Supabase Storage |
| File parsing | SheetJS (`xlsx`), Papaparse |
| Matching | Exact aliases, `fuse.js`, OpenAI semantic matching |
| AI | OpenAI SDK |
| Validation | Zod |
| Icons | Lucide React |
| Hosting | Vercel + Supabase |

---

## Project Structure

```
src/
  app/
    (auth)/          # Login, signup, server actions
    (dashboard)/     # Protected dashboard routes
    api/             # API route handlers
    auth/callback/   # Supabase OAuth callback
    onboarding/      # Academy setup
  components/
    dashboard/
    mapping/
    ui/
  lib/
    ai/              # OpenAI wrapper and usage logging
    dashboard/       # Dashboard summary queries
    db/              # Supabase service-role client, helpers, generated types
    matching/        # Exact, fuzzy, and AI column mapping
    parsers/         # CSV/Excel parsing
    scoring/         # Rule and AI scoring pipeline
    supabase/        # Supabase SSR/browser auth clients
supabase/
  migrations/        # SQL migrations and RLS policies
tests/
```

---

## Database

Core data flow:

`auth.users` -> `Academy` -> `Upload` -> `Student` -> `RiskAssessment` + `Action`

Reusable mapping templates live in `ColumnMapping`. AI usage metadata lives in `AiUsageLog`.

RLS is enabled in Supabase SQL migrations. Policies scope tenant data through the authenticated Supabase user and the owning academy.

---

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

### 3. Apply Migrations

```bash
npx supabase db push
```

After schema changes, regenerate DB types:

```bash
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Flow

```
Sign up / Google OAuth
        |
  Auth callback
  Supabase Auth session established
        |
  No academy? -> /onboarding
  Has academy? -> /dashboard
        |
  Upload CSV / Excel
        |
  Column mapping: exact -> fuzzy -> AI semantic
        |
  Confirm mapping / save template
        |
  Process upload and score student risk
        |
  Dashboard: at-risk list and recommended actions
```

---

## Available Commands

```bash
npm run dev           # Start local dev server
npm run build         # Production build
npm run lint          # ESLint
npm run test:scoring  # Unit tests for scoring/dashboard helpers

npx supabase db push
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```

Prisma is not used in this project.

---

## MVP Feature Status

| # | Feature | Status |
|---|---|---|
| F1 | Email / Google sign-up | Done |
| F2 | Academy profile creation | Done |
| F3 | CSV / Excel file upload | Done |
| F4 | Auto column mapping (3-layer) | Done |
| F5 | Manual column mapping override | Done |
| F6 | Save mapping as reusable template | Done |
| F7 | AI risk scoring per student | In progress |
| F8 | Risk reasoning | In progress |
| F9 | Suggested action per student | In progress |
| F10 | Retention dashboard | In progress |
| F11 | At-risk student list | Pending |
| F12 | Individual student detail page | Pending |
| F13 | Mark action taken | Pending |
| F14 | Email alerts | Pending |
| F23 | Stripe billing | Pending |

---

## Brand Colors

| Role | Hex |
|---|---|
| Primary (Deep Teal) | `#0F766E` |
| Accent (Warm Saffron) | `#F59E0B` |
| High Risk (Coral Red) | `#DC2626` |
| Success / Saved | `#10B981` |
| Text (Charcoal) | `#1F2937` |
| Background | `#FAFAF7` |

---

## License

Private. All rights reserved.

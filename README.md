# RakhoAI — AI-Powered Student Retention Analytics

> Upload your messy spreadsheet data. Get AI-powered churn predictions 14–21 days early. Take action before students leave.

Built for tutoring businesses running on Excel and WhatsApp — primarily in Pakistan, India, UAE, Nigeria, and the Philippines.

---

## What It Does

RakhoAI ingests any Excel or CSV file from a tutoring business, maps the messy columns to a standard schema using a 3-layer AI matching system, scores every student for churn risk, and surfaces a prioritised at-risk list with recommended actions.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Validation | Zod |
| Icons | Lucide React |
| Hosting | Vercel + Supabase |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, server actions
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── api/             # API route handlers
│   │   └── academy/     # Academy creation & retrieval
│   ├── auth/callback/   # Supabase OAuth callback
│   └── onboarding/      # Academy profile setup
├── components/
│   ├── dashboard/       # Dashboard shell & layout
│   └── ui/              # Shared UI primitives
├── lib/
│   ├── db/              # Prisma client singleton
│   └── supabase/        # Supabase client (server + browser)
├── generated/
│   └── prisma/          # Generated Prisma client & types
prisma/
├── schema.prisma
├── migrations/
└── prisma.config.ts
```

---

## Database Schema

```prisma
model User {
  id         String   @id @default(uuid())
  supabaseId String   @unique
  email      String   @unique
  name       String?
  createdAt  DateTime @default(now())
  academy    Academy?
}

model Academy {
  id        String   @id @default(uuid())
  ownerId   String   @unique
  owner     User     @relation(...)
  name      String
  country   String
  currency  String   @default("USD")
  createdAt DateTime @default(now())
}
```

Row-level security (RLS) is enabled on both tables — each user can only access their own data.

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-org/rakhoai.git
cd rakhoai
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

### 3. Run migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Flow

```
Sign up / Google OAuth
        ↓
  Auth callback
  (User upserted in DB)
        ↓
  No academy? → /onboarding (create academy profile)
  Has academy? → /dashboard
        ↓
  Upload CSV / Excel
        ↓
  AI column mapping (3-layer: exact → fuzzy → semantic)
        ↓
  AI risk scoring per student
        ↓
  Dashboard: at-risk list, recommended actions
```

---

## Available Commands

```bash
npm run dev           # Start local dev server
npm run build         # Production build
npm run lint          # ESLint

npx prisma migrate dev       # Run DB migrations
npx prisma generate          # Regenerate Prisma client
npx prisma studio            # Browse database
```

---

## MVP Feature Status

| # | Feature | Status |
|---|---|---|
| F1 | Email / Google sign-up | ✅ Done |
| F2 | Academy profile creation | ✅ Done |
| F3 | CSV / Excel file upload | 🔄 In progress |
| F4 | Auto column mapping (3-layer) | ⬜ Pending |
| F5 | Manual column mapping override | ⬜ Pending |
| F6 | Save mapping as reusable template | ⬜ Pending |
| F7 | AI risk scoring per student | ⬜ Pending |
| F8 | Risk reasoning | ⬜ Pending |
| F9 | Suggested action per student | ⬜ Pending |
| F10 | Retention dashboard | ⬜ Pending |
| F11 | At-risk student list | ⬜ Pending |
| F12 | Individual student detail page | ⬜ Pending |
| F13 | Mark action taken | ⬜ Pending |
| F14 | Email alerts | ⬜ Pending |
| F23 | Stripe billing | ⬜ Pending |

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

Private — all rights reserved.

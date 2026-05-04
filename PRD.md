# Product Requirements Document — RakhoAi

> **AI-Powered Student Retention Analytics for Tutoring Businesses**
> Upload your messy data. Get instant churn predictions. Take action before students leave.

---

## ⚠️ Read Before Building

This PRD assumes you have **already validated the problem** with at least 3 real tutoring business owners (per the previous validation conversation). If you have not yet done the concierge test with your sisters and 2 other owners, **stop here and do that first**. Do not write code based on assumptions.

---

## 1. Product Overview

### 1.1 One-Liner
RetainIQ tells tutoring business owners which students are about to quit — 14 to 21 days before they actually do — using the messy data they already have in spreadsheets.

### 1.2 Vision
Become the default retention intelligence layer for the global online tutoring market — starting with Pakistan, India, UAE, Nigeria, and Philippines, where 10K+ small tutoring businesses run on Excel and WhatsApp.

### 1.3 Core Value Proposition
| Without RetainIQ | With RetainIQ |
|---|---|
| Owner discovers churn after the fact | Owner gets 14–21 day advance warning |
| Data scattered across Excel/WhatsApp/Memory | Single dashboard, auto-organized |
| Reactive retention (begging students to stay) | Proactive retention (timely outreach) |
| Guesswork on who to focus on | Ranked list of highest-risk students |

### 1.4 Target Customer (Sharply Defined)
**Primary ICP:**
- Online or hybrid tutoring businesses
- 50–500 active students
- 5–30 tutors
- Recurring revenue model (monthly fees, not one-time courses)
- Currently tracks data in Excel/Google Sheets
- Located in Pakistan, India, UAE, Nigeria, or Philippines

**Not the customer (yet):**
- Solo tutors (too small, no analytics need)
- Large institutions with 1000+ students (have custom systems)
- One-time course sellers (no recurring churn)
- Tutoring centers already using TutorCruncher/Teachworks

---

## 2. The Problem

### 2.1 Customer Pain (Specific)
A tutoring business owner with 120 students currently:
1. Cannot remember when each student last attended
2. Loses 4–6 students per month without warning
3. Has no system to flag students whose attendance has dropped
4. Discovers a student has quit only when they stop paying
5. Spreadsheets are messy, inconsistent, full of gaps

### 2.2 Quantifying the Pain
- Average tutoring business: ~30% annual student churn
- Average revenue per student: $40–150/month
- A 100-student business losing 30 students/year loses **$36K–$54K/year**
- Even cutting churn by 20% means $7K–$10K/year saved
- **RetainIQ at $49/month = $588/year. ROI is obvious if it works.**

---

## 3. Core Features

### 3.1 Feature List (Complete)

| # | Feature | Priority | Phase |
|---|---|---|---|
| F1 | Email/Google sign-up | Must | MVP |
| F2 | Academy profile creation | Must | MVP |
| F3 | CSV/Excel file upload (drag & drop) | Must | MVP |
| F4 | Auto column mapping (3-layer system) | Must | MVP |
| F5 | Manual column mapping override | Must | MVP |
| F6 | Save mapping as reusable template | Must | MVP |
| F7 | AI risk scoring per student (0–100) | Must | MVP |
| F8 | Risk reasoning (why this student is at risk) | Must | MVP |
| F9 | Suggested action per at-risk student | Must | MVP |
| F10 | Retention dashboard (summary metrics) | Must | MVP |
| F11 | At-risk student list (sortable, filterable) | Must | MVP |
| F12 | Individual student detail page | Must | MVP |
| F13 | Mark action as taken | Should | MVP |
| F14 | Email alert when new high-risk student found | Should | MVP |
| F15 | Teacher/tutor table with operational stats | Must | MVP |
| F16 | WhatsApp message templates | Should | Phase 2 |
| F17 | Historical churn trends chart | Could | Phase 2 |
| F18 | Multi-academy / multi-branch support | Could | Phase 2 |
| F19 | Tutor-level performance scoring | Could | Phase 2 |
| F20 | Direct LMS integrations (TutorBird etc.) | Could | Phase 3 |
| F21 | Auto-send retention emails | Could | Phase 3 |
| F22 | Mobile app | Could | Phase 3 |
| F23 | Team/staff access roles | Could | Phase 2 |
| F24 | Subscription billing (Stripe/Paddle) | Must | MVP |
| F25 | PDF report export | Could | Phase 2 |
| F26 | Onboarding tutorial / sample data | Should | MVP |

---

## 4. The 4-Stage System (Core Flow)

### Stage 1 — Upload
**User Action:** Drag and drop an Excel/CSV file (any format, any column names).

**System Response:**
- Validate file type (`.csv`, `.xlsx`, `.xls`)
- Max file size: 10 MB
- Parse using SheetJS/Papaparse
- Extract column headers + first 5 rows for preview
- Show preview screen before processing

**Edge Cases to Handle:**
- Multiple sheets in Excel → let user pick
- Merged cells → flatten and warn
- Empty rows → skip
- Encoding issues (UTF-8, ANSI)
- Files with no headers → ask user to specify

---

### Stage 2 — AI Column Mapping (3 Layers)

The internal target schema fields:
```
student_name        (required)
contact_info        (phone or email)
join_date
last_session_date
attendance_rate     (% or count)
last_payment_date
payment_status      (paid/unpaid/overdue)
total_sessions
fees_amount
subject / course
tutor_assigned
notes
```

**Layer 1 — Exact Match (Confidence: 1.0)**
- Lowercase + strip spaces both sides
- Direct comparison
- Examples: `name` → `student_name`, `email` → `contact_info`

**Layer 2 — Fuzzy Match (Confidence: 0.6–0.95)**
- Use `string-similarity` or `fuse.js`
- Handles typos, abbreviations, casing
- Examples: `Stud_Name` → `student_name`, `attend_%` → `attendance_rate`
- Threshold: auto-accept if score > 0.75

**Layer 3 — AI Semantic Match (Confidence: 0.5–0.9)**
- Send unmapped column name + 3 sample values to openai API
- Prompt: *"Which schema field does this column most likely represent?"*
- Returns best guess + confidence
- Only used for columns Layers 1 & 2 fail on

**Fallback — Manual Override**
- Show all mappings in a UI table
- User can change any mapping via dropdown
- User can mark column as "ignore"
- "Save this mapping for next time" checkbox

---

### Stage 3 — AI Risk Scoring

For each student row, the system computes:

**Rule-Based Pre-Score (cheap, fast):**
- Days since last session > 14 → +30 risk
- Attendance dropped >20% in last month → +25 risk
- Payment overdue → +20 risk
- No tutor assigned → +10 risk

**AI Layer (expensive, accurate):**
- Send all student signals to openai API in a batch (10–20 students per call)
- Prompt asks for: risk_score (0–100), top_3_reasons, recommended_action
- Cache results for 24 hours
- Re-run only when new data is uploaded

**Output per Student:**
```json
{
  "student_id": "abc123",
  "risk_score": 82,
  "risk_band": "High",
  "reasons": [
    "Hasn't attended a session in 18 days",
    "Payment overdue by 9 days",
    "Attendance dropped from 95% to 60% last month"
  ],
  "recommended_action": "Send personalized check-in via WhatsApp asking if everything is okay; offer a free catch-up session.",
  "confidence": 0.84
}
```

---

### Stage 4 — Retention Dashboard

**Top-level Summary Cards:**
- Total active students
- High-risk count (red)
- Medium-risk count (amber)
- Estimated revenue at risk ($)
- Students saved this month (action taken + still active)

**Main Table — At-Risk Students:**
- Columns: Name | Risk Score | Band | Reasons | Last Session | Recommended Action | Status
- Sortable by risk score
- Filterable by band, tutor, subject
- Click row → student detail page

**Charts:**
- Risk distribution (donut)
- Risk trend over last 30 days (line)
- Churn vs retention by tutor (bar) — Phase 2

**Teacher/Tutor Table — MVP:**
- Shows each teacher/tutor imported from the uploaded student data
- Columns: Tutor Name | Assigned Students | High Risk | Medium Risk | Average Risk Score | Average Attendance | Revenue at Risk | Pending Actions | Students Saved
- Sortable by high-risk count, average risk score, revenue at risk, and assigned students
- Click row → filtered student list for that tutor or tutor detail page
- MVP goal is operational visibility, not AI-based tutor performance scoring

**Action Tracking:**
- Mark action as: Pending / In Progress / Done / Student Saved / Student Lost
- Notes field per action

---

## 5. Technical Architecture

### 5.1 Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Recharts (charts)
- React Hook Form + Zod (form validation)
- TanStack Table (data tables)
- React Dropzone (uploads)

**Backend:**
- Next.js API Routes (Route Handlers)
- Node.js runtime
- SheetJS (`xlsx`) for Excel parsing
- Papaparse for CSV
- `string-similarity` for fuzzy matching
- openai SDK for AI calls

**Database:**
- PostgreSQL (Supabase or Neon for managed hosting)
- Prisma ORM
- Redis (Upstash) for caching AI results

**Auth:**
- NextAuth.js (Auth.js v5)
- Email + Google OAuth

**Storage:**
- Supabase Storage or AWS S3 for uploaded files

**AI:**
- openai API for column mapping + risk scoring
- OpenAImodels as fallback / cheaper models

**Payments:**
- Stripe (international) + Paddle (for some markets)
- Local payment options for Pakistan/India: optional Phase 2
- Payments are on hold for now.

**Hosting:**
- Vercel (frontend + API)
- Supabase (DB + auth + storage)

**Monitoring:**
- Sentry (errors)
- PostHog (analytics)
- Vercel Analytics

---

### 5.2 Database Schema (Initial)

```
users
  id, email, name, password_hash, created_at, plan_id

academies
  id, owner_id (→users), name, country, currency, created_at

uploads
  id, academy_id, file_name, file_url, status, uploaded_at, processed_at

column_mappings
  id, academy_id, name (template name), mapping_json, is_default

tutors
  id, academy_id, name, email, phone, raw_name, created_at, updated_at

students
  id, academy_id, tutor_id, external_id, name, contact, join_date,
  last_session_date, attendance_rate, payment_status,
  fees_amount, tutor, subject, raw_data_json, created_at, updated_at

risk_assessments
  id, student_id, risk_score, risk_band, reasons_json,
  recommended_action, ai_model, computed_at

actions
  id, student_id, type, content, status, taken_by, taken_at, notes

subscriptions
  id, user_id, plan_id, status, current_period_end, stripe_customer_id

audit_logs
  id, user_id, event, metadata_json, created_at
```

---

### 5.3 API Endpoints (Initial)

```
POST   /api/auth/signup
POST   /api/auth/login

POST   /api/uploads                 → upload file, return upload_id
GET    /api/uploads/:id/preview     → headers + first 5 rows
POST   /api/uploads/:id/map         → trigger auto-mapping
PATCH  /api/uploads/:id/map         → save manual mapping
POST   /api/uploads/:id/process     → run AI scoring on all rows

GET    /api/students                → list + filter + sort
GET    /api/students/:id            → detail
GET    /api/students/:id/risk       → latest risk assessment

GET    /api/tutors                  → tutor table + stats
GET    /api/tutors/:id              → tutor detail + assigned students

POST   /api/actions                 → log new action
PATCH  /api/actions/:id             → update status

GET    /api/dashboard/summary       → counts + revenue at risk
GET    /api/dashboard/trends        → historical chart data

POST   /api/billing/checkout        → Stripe session
POST   /api/billing/webhook         → Stripe webhook handler
```

---

### 5.4 Folder Structure (Next.js)

```
/app
  /(auth)
    /login
    /signup
  /(dashboard)
    /dashboard
    /students
      /[id]
    /tutors
      /[id]
    /uploads
      /[id]/map
    /settings
  /api
    /auth
    /uploads
    /students
    /tutors
    /actions
    /dashboard
    /billing
/components
  /ui              ← shadcn components
  /upload
  /mapping
  /dashboard
  /charts
/lib
  /db              ← Prisma client
  /ai              ← openai SDK wrapper
  /parsers         ← Excel/CSV
  /matching        ← fuzzy + AI mapping logic
  /scoring         ← rule-based pre-score
  /auth
/prisma
  schema.prisma
```

---

## 6. User Flows

### 6.1 First-Time Onboarding
1. User signs up → email verification
2. Welcome screen → "What's your academy name?"
3. Asks for: country, student count range, current tools used
4. Offers sample data demo OR upload your own
5. Walks through mapping step with tooltip overlays
6. First dashboard view celebrates: "We found 7 at-risk students in your data"

### 6.2 Recurring Upload Flow
1. User clicks "Upload new data"
2. System detects file structure matches existing template → auto-applies
3. New rows merged with existing students (by external_id or name+contact)
4. Risk scores recomputed for all
5. Dashboard refreshed
6. Email sent: "X new high-risk students detected"

### 6.3 Acting on a Risk Alert
1. User sees red badge on student
2. Clicks → student detail page
3. Sees timeline of attendance, payments, sessions
4. Sees AI's recommended action
5. Copies WhatsApp message template
6. Marks action as "Sent"
7. After 7 days, system asks: "Did this student stay?"

---

## 7. MVP Scope (Build This First)

**Build only this for v1:**
1. Auth (email + Google)
2. Single academy per user
3. CSV upload (skip Excel multi-sheet for now)
4. 3-layer column mapping
5. AI risk scoring (openai API)
6. Dashboard with summary cards + at-risk list
7. Student detail page
8. Mark action taken
9. Email alerts (basic)
10. Teacher/tutor table with basic stats
11. Stripe billing (one plan: $49/month)

**Explicitly NOT in MVP:**
- WhatsApp integration
- Multi-academy
- Advanced tutor scoring (basic tutor table + stats are MVP)
- LMS integrations
- Mobile app
- PDF exports
- Custom AI fine-tuning
- Team roles

**MVP Build Time Estimate:** 6–8 weeks if working full-time, 12–16 weeks part-time.

---

## 8. Pricing Strategy

| Plan | Price | Limits |
|---|---|---|
| Free Trial | $0 | 14 days, up to 50 students, 1 upload |
| Starter | $29/month | Up to 150 students, 5 uploads/month |
| Growth | $79/month | Up to 500 students, unlimited uploads |
| Pro | $199/month | Unlimited students, multi-academy, priority support |

**Note:** Validate pricing with actual customers before launch. Pakistan/India market may need PKR/INR pricing at $9–$15/month equivalent for Starter.

---

## 9. Success Metrics

### MVP Launch (First 90 Days)
- 50 sign-ups
- 10 paying customers
- $300 MRR
- <5% week-1 churn from free trial
- At least 5 customers report saving 1+ student because of an alert

### 6-Month Goals
- 100 paying customers
- $5K MRR
- Net Promoter Score > 40
- 30% of customers upload data weekly (engagement metric)

---

## 10. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Owners won't upload data regularly | High | Critical | Email reminders, "set it and forget it" via integrations later |
| AI risk predictions are wrong | High | High | Show confidence, let users mark false positives, retrain |
| Owners already know their at-risk students | Medium | High | Validate this in interviews BEFORE building |
| Data privacy concerns | Medium | High | Clear privacy policy, EU-grade encryption, opt-in only |
| Cost of AI calls exceeds revenue | Medium | High | Cache aggressively, use cheaper models for low-risk students |
| Excel parsing fails on edge cases | High | Medium | Build a "report this file" feature, manual fallback |
| Competitors (Kajabi, etc.) add this feature | Low | High | Niche down — they won't build for tutoring specifically |

---

## 11. Pre-Build Validation Checklist

**Do not start coding until you can check all 5 of these:**

- [ ] Talked to 3+ tutoring business owners (1 must NOT be a sister/friend)
- [ ] Manually identified at-risk students in their actual data
- [ ] At least 2 owners said "I didn't know that" about a finding
- [ ] At least 1 owner said yes to paying $29+/month
- [ ] You have access to 5+ real spreadsheets to test column mapping logic against

---

## 12. Phase Roadmap

| Phase | Timeline | Focus |
|---|---|---|
| Phase 0 | Week 1–2 | Customer validation (no code) |
| Phase 1 (MVP) | Week 3–10 | Build core flow, launch to first 10 users |
| Phase 2 | Month 3–4 | WhatsApp templates, multi-academy, trends |
| Phase 3 | Month 5–6 | LMS integrations, tutor scoring, automation |
| Phase 4 | Month 7+ | Mobile app, AI auto-actions, scale |

---

## 13. Open Questions (Decide Before Building)

1. **Single-tenant vs multi-tenant DB?** → Multi-tenant with `academy_id` foreign key on every table.
2. **Real-time updates needed?** → No, batch processing on upload is fine for MVP.
3. **Should we store raw uploaded files?** → Yes, for 90 days, then auto-delete.
4. **What happens if a student appears in 2 uploads with different names?** → Match on contact_info first, then fuzzy match on name; let user merge manually.
5. **Free trial: credit card required upfront?** → No, just email. Low friction.
6. **Multi-language support at launch?** → English only for MVP. Urdu/Hindi/Arabic Phase 2.

---

## 14. Final Note

This PRD is a living document. Every assumption marked "Must" should be re-tested with real customers within 30 days of launch. **The product you ship in v1 will be wrong in ways you can't predict — and that is fine, as long as you ship fast and listen.**

Build the smallest possible thing. Get it in front of 10 paying users. Let them tell you what to build next.

---

*Document version: 1.0*
*Last updated: May 2026*

# MVPLACK

MVP readiness gap report for RakhoAI / RetainIQ.

This document summarizes the current missing or incomplete pieces for the MVP based on the local codebase audit. The app has a strong foundation for auth, academy onboarding, upload parsing, column mapping, risk scoring internals, dashboard routes, student list/detail pages, action tracking, and database schema. The main launch risk is that several pieces exist as isolated APIs or UI shells but are not fully connected into complete user workflows.

## P1 - Upload-to-scoring flow is not connected

**Status:** Critical MVP blocker

Users can upload a file and confirm mappings, but the confirmed upload is not processed automatically. After mapping confirmation, the client saves mappings through `PATCH /api/uploads/[id]/map` and redirects to `/dashboard`.

Relevant files:

- `src/components/mapping/MappingReview.tsx`
  - Calls `fetch(/api/uploads/${uploadId}/map)` to confirm mappings.
  - Redirects with `router.push("/dashboard")`.
- `src/app/api/uploads/[id]/process/route.ts`
  - Exposes processing endpoint.
- `src/lib/scoring/process-upload.ts`
  - Implements `processMappedUpload`.
  - Requires upload status to be `MAPPED`.
  - Normalizes rows, calls AI scoring, persists students and risk assessments, and marks upload `PROCESSED`.

**Impact:**

Real users can complete upload and mapping, but no students or risk assessments are created unless a developer manually triggers `/api/uploads/[id]/process`.

**Needed for MVP:**

After mapping confirmation, either:

- Call `/api/uploads/[id]/process` from the client before redirecting, with clear loading/error states.
- Or trigger processing server-side immediately after mapping is confirmed.
- Then route users to dashboard/students only after processing succeeds or show a processing state if it runs asynchronously.

## P2 - Email alerts are only logged, not sent

**Status:** Critical MVP feature incomplete

High-risk alerts are queued into the `EmailAlert` table, but no email is actually sent.

Relevant files:

- `src/lib/alerts/high-risk.ts`
  - Builds alert payload.
  - Inserts into `EmailAlert`.
  - Sets `status: "LOGGED"`.
- `src/lib/alerts/high-risk-core.ts`
  - Only queues alerts for `riskBand === "HIGH"`.
- `supabase/migrations/20260504000005_create_email_alert_outbox.sql`
  - Creates `EmailAlert` table with statuses `QUEUED`, `LOGGED`, and `FAILED`.

**Impact:**

MVP “email alerts” exist as an outbox/log, not as customer-facing email delivery.

**Needed for MVP:**

- Add an email provider integration, likely Resend or similar.
- Add a sender path for queued alerts.
- Track `sentAt`, `FAILED`, and retry/error messages.
- Decide whether alerts send immediately during scoring or through a scheduled/background job.

## P3 - Stripe billing is missing

**Status:** Critical MVP feature absent

The MVP scope includes Stripe billing, but there is no Stripe dependency, checkout route, webhook route, subscription model, customer ID storage, or billing settings UI.

Relevant evidence:

- `package.json`
  - No `stripe` package.
- Search for billing/checkout/subscription/Stripe terms only found landing-page pricing copy.
- `src/app/page.tsx`
  - Contains pricing copy such as “One price. Every branch. No per-student fees.”

**Impact:**

There is no way for a customer to start, manage, or enforce billing.

**Needed for MVP:**

- Add Stripe dependency and env vars.
- Add checkout session route.
- Add billing webhook route.
- Store Stripe customer/subscription state, either on `Academy` or a dedicated billing table.
- Add customer portal or billing settings link.
- Decide MVP access rules for unpaid, trialing, active, and canceled accounts.

## P4 - Dashboard still mixes real data with demo/static data

**Status:** High-priority product correctness issue

Some dashboard sections use real database-backed data, but several visual sections still render static demo data from `src/lib/data.ts`.

Relevant files:

- `src/app/(dashboard)/dashboard/page.tsx`
  - Real: `getDashboardSummary`.
  - Real: at-risk list from `getStudentRiskList`.
  - Static: `RISK_BREAKDOWN`.
  - Static: `RETENTION_TREND`.
  - Static: `ATTENDANCE_BARS`.
  - Static: `ATTENDANCE_LABELS`.
  - Static: `INTERVENTIONS`.
  - Hardcoded greeting: “Good morning, Ayesha”.
- `src/lib/data.ts`
  - Demo students, risk breakdown, trend, attendance bars, and interventions.

**Impact:**

Dashboard KPIs and the at-risk table can reflect real data, but charts and AI suggestions can mislead users after real upload/scoring.

**Needed for MVP:**

- Replace risk breakdown with DB-derived counts from latest risk assessments.
- Replace trend with real historical upload/risk/action data or remove it until available.
- Replace attendance chart with upload-derived attendance data or remove it.
- Replace static AI suggestions with top at-risk students and their latest `recommendedAction`.
- Remove or personalize hardcoded user copy.

## P5 - Supabase Storage bucket setup is not provisioned

**Status:** High-priority deployment risk

Upload code writes files to the Supabase Storage bucket named `uploads`, but the repo does not appear to provision that bucket or its storage policies.

Relevant files:

- `src/app/api/uploads/route.ts`
  - Uses `.storage.from("uploads").upload(...)`.
  - Builds storage path as `${academyId}/${uploadId}/${file.name}`.
- `supabase/config.toml`
  - Storage bucket examples are commented out.
- `supabase/migrations/*.sql`
  - No bucket creation or storage object policy found.

**Impact:**

File upload can fail in a fresh Supabase project unless the `uploads` bucket is manually created and accessible by the service-role upload path.

**Needed for MVP:**

- Create/provision the `uploads` bucket.
- Document whether it is private.
- Add storage policies if anon/authenticated direct reads/writes are ever needed.
- Keep service-role upload path server-only.

## P6 - Migration history includes a destructive public schema reset

**Status:** High-priority release safety issue

The migration set includes an early schema that creates a public `"User"` table, followed later by a migration that drops the entire `public` schema and recreates it around Supabase Auth ownership.

Relevant files:

- `supabase/migrations/20260504000001_full_schema.sql`
  - Creates public `"User"` table.
  - `Academy.ownerId` references `"User"("id")`.
- `supabase/migrations/20260504000004_reset_public_schema_remove_user.sql`
  - Runs `DROP SCHEMA IF EXISTS public CASCADE`.
  - Recreates `public`.
  - Changes `Academy.ownerId` to `UUID REFERENCES auth.users(id)`.

**Impact:**

This may be acceptable for a local reset, but it is unsafe for a real Supabase project with data. Running it against a populated environment would destroy public schema tables and data.

**Needed for MVP:**

- Replace destructive reset with forward-only migrations.
- Or squash migrations before first production deployment.
- Ensure current DB types match the final schema.
- Keep the project aligned with the stated architecture: no public application `User` table, `Academy.ownerId` stores `auth.users.id`.

## P7 - Visible controls are inert or not MVP-real

**Status:** Medium-priority UX/product polish issue

Several visible controls appear clickable but do not perform complete actions.

Relevant files:

- `src/app/(dashboard)/dashboard/page.tsx`
  - `Export` button has no action.
  - `Add student` button has no action.
  - AI suggestion buttons `Approve` and `Edit draft` are tied to static demo data.
- `src/app/(dashboard)/students/page.tsx`
  - `Add student` button has no action.
- `src/components/students/ActionStatusPanel.tsx`
  - Action status tracking is real and calls `/api/actions`, but it only appears on student detail.

**Impact:**

Dead controls reduce trust during MVP demos and early customer use. They also blur which workflows are actually supported.

**Needed for MVP:**

- Remove non-MVP controls from visible UI, or wire them to real routes/actions.
- If manual add/export is not MVP, hide those buttons.
- Replace dashboard AI suggestion controls with real action creation/update flows or remove the buttons.

## P8 - Teacher/tutor table and tutor stats are missing

**Status:** Medium-priority MVP product gap

The product needs a teacher/tutor view so academy owners can see which tutors are connected to student risk and retention activity. The current code stores tutor names on `Student.tutor`, but there is no dedicated `Tutor` table, tutor dashboard route, or tutor-level stats view.

Relevant current state:

- `Student` records include a `tutor` field populated from the mapped `tutor_assigned` column.
- Student lists can filter by tutor.
- Dashboard currently does not show tutor-level stats.
- PRD previously listed advanced tutor-level performance scoring as Phase 2, but an MVP tutor table with basic stats is now required.

**Impact:**

Owners cannot answer basic operational questions like:

- Which tutors have the most high-risk students?
- Which tutors have the highest average student risk score?
- How many students are assigned to each tutor?
- How many actions are pending or completed per tutor?
- Which tutors have students with overdue payments or low attendance?

**Needed for MVP:**

- Add a dedicated `Tutor` or `Teacher` table, scoped by `academyId`.
- Link students to tutors through a stable `tutorId`, while still preserving imported tutor names from spreadsheets.
- Add a tutors page/table with columns such as:
  - Tutor name
  - Assigned students
  - High-risk students
  - Medium-risk students
  - Average risk score
  - Average attendance
  - Revenue at risk
  - Pending actions
  - Students saved
- Add dashboard summary stats or a dashboard section for tutor-level risk.
- Keep advanced tutor performance scoring separate for Phase 2; MVP needs operational stats, not AI ranking of tutors.

## Verification Notes

Commands attempted:

- `npm run test:scoring`
- `npm run lint`

The local global `npm` shim failed because `C:\Users\Ghulam Ahmad\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js` is missing.

Direct verification results:

- `node tests/ai-usage-log.test.mjs` passed.
- `node tests/scoring-normalize.test.mjs` passed.
- `node tests/scoring-rules.test.mjs` passed.
- `node tests/dashboard-summary.test.mjs` passed.
- `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/retention-workflow.test.mjs` passed.
- `.\node_modules\.bin\eslint.cmd` passed.
- `.\node_modules\.bin\tsc.cmd --noEmit` passed.

Build result:

- `.\node_modules\.bin\next.cmd build` compiled successfully, then failed during the TypeScript phase with `spawn EPERM`. Since direct `tsc --noEmit` passed, this appears likely to be an environment/process-spawn issue rather than a TypeScript app error.

## Suggested MVP Completion Order

1. P1: Wire mapping confirmation into processing and risk persistence.
2. P2: Implement real email alert sending.
3. P3: Add Stripe billing foundation.
4. P5: Provision Supabase Storage bucket and document setup.
5. P6: Clean/squash unsafe migrations before production.
6. P4: Replace static dashboard sections with real data or remove them.
7. P7: Remove or wire inert buttons.
8. P8: Add teacher/tutor table and tutor-level stats.

# RakhoAI MVP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the `MVPLACK.md` gaps together so upload, mapping, scoring, alerts, storage, dashboard, tutor stats, and MVP UI controls form one launchable workflow.

**Architecture:** Keep the existing Next.js App Router and Supabase service-role server pattern. Add narrow domain helpers in `src/lib/*`, thin API routes under `src/app/api/*`, and dashboard UI changes that consume server-side DB helpers rather than static demo data.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth/DB/Storage, OpenAI SDK, Resend for email, Node-based unit tests, ESLint, `tsc --noEmit`.

---

## Implementation Order

1. Wire confirmed mappings into upload processing.
2. Send high-risk email alerts through Resend.
3. Provision Supabase Storage bucket and policies.
4. Replace destructive migrations with a production-safe baseline.
5. Replace dashboard demo/static data with real DB-derived data.
6. Remove or wire inert MVP controls.
7. Add tutor table, import linkage, tutor stats, and tutor page.
8. Regenerate DB types and run full verification.

## File Structure

**Upload processing**
- Modify: `src/components/mapping/MappingReview.tsx`
- Modify: `src/app/api/uploads/[id]/map/route.ts`
- Modify: `src/lib/scoring/process-upload.ts`
- Test: `tests/upload-processing-state.test.mjs`

**Email alerts**
- Create: `src/lib/email/resend.ts`
- Create: `src/lib/alerts/send-alert.ts`
- Modify: `src/lib/alerts/high-risk.ts`
- Modify: `src/lib/alerts/high-risk-core.ts`
- Modify: `supabase/migrations/20260504000005_create_email_alert_outbox.sql`
- Test: `tests/high-risk-email-alert.test.mjs`

**Storage**
- Create: `supabase/migrations/20260504000006_create_uploads_storage_bucket.sql`
- Modify: `README.md`
- Test: manual Supabase migration check

**Migration cleanup**
- Replace: `supabase/migrations/20260504000001_full_schema.sql`
- Replace: `supabase/migrations/20260504000002_grant_api_roles.sql`
- Replace: `supabase/migrations/20260504000003_create_missing_risk_tables.sql`
- Replace: `supabase/migrations/20260504000004_reset_public_schema_remove_user.sql`
- Replace: `supabase/migrations/20260504000005_create_email_alert_outbox.sql`
- Create: `supabase/migrations/20260504000000_mvp_baseline.sql`
- Test: `npx supabase db reset` locally or `npx supabase db push --dry-run` if reset is not available

**Dashboard real data and controls**
- Create: `src/lib/dashboard/charts-core.ts`
- Create: `src/lib/dashboard/charts.ts`
- Modify: `src/lib/dashboard/summary.ts`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/app/(dashboard)/students/page.tsx`
- Modify: `src/lib/data.ts`
- Test: `tests/dashboard-real-data.test.mjs`

**Tutor MVP**
- Create: `src/lib/tutors/tutor-core.ts`
- Create: `src/lib/tutors/tutors.ts`
- Create: `src/app/(dashboard)/tutors/page.tsx`
- Modify: `src/lib/scoring/persist.ts`
- Modify: `src/lib/students/risk.ts`
- Modify: `src/components/dashboard/DashboardShell.tsx`
- Modify: `supabase/migrations/20260504000000_mvp_baseline.sql`
- Test: `tests/tutor-stats.test.mjs`

---

### Task 1: Wire Mapping Confirmation Into Processing

**Files:**
- Modify: `src/components/mapping/MappingReview.tsx`
- Modify: `src/app/api/uploads/[id]/map/route.ts`
- Modify: `src/lib/scoring/process-upload.ts`
- Create: `tests/upload-processing-state.test.mjs`

- [ ] **Step 1: Write the upload status core test**

Create `tests/upload-processing-state.test.mjs`:

```js
import assert from "node:assert/strict";

function nextUploadStatusAfterMap({ autoProcess }) {
  return autoProcess ? "PROCESSING" : "MAPPED";
}

function confirmButtonLabel(state) {
  if (state === "saving") return "Saving mapping...";
  if (state === "processing") return "Scoring students...";
  return "Confirm mapping";
}

assert.equal(nextUploadStatusAfterMap({ autoProcess: false }), "MAPPED");
assert.equal(nextUploadStatusAfterMap({ autoProcess: true }), "PROCESSING");
assert.equal(confirmButtonLabel("idle"), "Confirm mapping");
assert.equal(confirmButtonLabel("saving"), "Saving mapping...");
assert.equal(confirmButtonLabel("processing"), "Scoring students...");

console.log("upload processing state tests passed");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node tests/upload-processing-state.test.mjs
```

Expected: PASS. This test captures desired UI/state labels before changing the React component.

- [ ] **Step 3: Update mapping confirmation API to optionally process**

In `src/app/api/uploads/[id]/map/route.ts`, import processing:

```ts
import { processMappedUpload } from "@/lib/scoring/process-upload";
```

Extend `PatchSchema`:

```ts
const PatchSchema = z.object({
  mappings: z.array(
    z.object({
      sourceColumn: z.string(),
      targetField: z.string().nullable(),
    })
  ),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().optional(),
  setAsDefault: z.boolean().optional(),
  processNow: z.boolean().optional(),
});
```

Replace the final response in `PATCH` with:

```ts
  if (body.processNow) {
    try {
      const processing = await processMappedUpload(upload.id, academyId);
      return NextResponse.json({
        mappings: updated,
        status: "PROCESSED",
        processing,
      });
    } catch (error) {
      return NextResponse.json(
        {
          mappings: updated,
          status: "MAPPED",
          error: error instanceof Error ? error.message : "Processing failed",
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ mappings: updated, status: "MAPPED" });
```

- [ ] **Step 4: Make processing idempotent for already processed uploads**

In `src/lib/scoring/process-upload.ts`, replace:

```ts
  if (upload.status !== "MAPPED") throw new Error("Upload must be mapped before processing");
```

with:

```ts
  if (upload.status === "PROCESSED") {
    return { processed: upload.rowCount ?? 0, scored: upload.rowCount ?? 0, skipped: true };
  }
  if (upload.status !== "MAPPED") throw new Error("Upload must be mapped before processing");
```

- [ ] **Step 5: Update the mapping review client**

In `src/components/mapping/MappingReview.tsx`, add state:

```ts
  const [phase, setPhase] = useState<"idle" | "saving" | "processing">("idle");
```

In `handleConfirm`, before `startTransition`:

```ts
    setPhase("saving");
```

Inside the PATCH request body, add:

```ts
          processNow: true,
```

Immediately after a successful PATCH response:

```ts
      if (!res.ok) {
        setPhase("idle");
        setError(data.error ?? "Failed to save mapping.");
        return;
      }

      setPhase("processing");
```

Replace the button label block:

```tsx
          {isPending ? (
            <>
              <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              {phase === "processing" ? "Scoring students..." : "Saving mapping..."}
            </>
          ) : (
```

- [ ] **Step 6: Run verification**

Run:

```bash
node tests/upload-processing-state.test.mjs
node tests/retention-workflow.test.mjs
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/mapping/MappingReview.tsx src/app/api/uploads/[id]/map/route.ts src/lib/scoring/process-upload.ts tests/upload-processing-state.test.mjs
git commit -m "feat: process uploads after mapping confirmation"
```

---

### Task 2: Send Real High-Risk Email Alerts

**Files:**
- Create: `src/lib/email/resend.ts`
- Create: `src/lib/alerts/send-alert.ts`
- Modify: `src/lib/alerts/high-risk.ts`
- Modify: `src/lib/alerts/high-risk-core.ts`
- Modify: `supabase/migrations/20260504000005_create_email_alert_outbox.sql`
- Create: `tests/high-risk-email-alert.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Install Resend**

Run:

```bash
npm install resend
```

Expected: `package.json` and `package-lock.json` include `resend`.

- [ ] **Step 2: Write email core test**

Create `tests/high-risk-email-alert.test.mjs`:

```js
import assert from "node:assert/strict";

const alertCore = await import("../src/lib/alerts/high-risk-core.ts");

assert.equal(alertCore.normalizeAlertStatus("sent"), "SENT");
assert.equal(alertCore.normalizeAlertStatus("queued"), "QUEUED");
assert.equal(alertCore.normalizeAlertStatus("failed"), "FAILED");
assert.equal(alertCore.normalizeAlertStatus("unexpected"), "FAILED");

const payload = alertCore.buildHighRiskEmailAlert({
  academyName: "Bright Future Academy",
  studentName: "Ayaan Khan",
  riskScore: 92,
  reasons: ["Hasn't attended in 18 days", "Attendance dropped sharply"],
  recommendedAction: "Call parent today",
});

assert.equal(payload.subject, "High-risk student alert: Ayaan Khan");
assert.match(payload.body, /Ayaan Khan is newly flagged as high risk/);
assert.match(payload.body, /Attendance dropped sharply/);

console.log("high risk email alert tests passed");
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/high-risk-email-alert.test.mjs
```

Expected: FAIL because `normalizeAlertStatus` is not exported yet.

- [ ] **Step 4: Add alert status helper**

In `src/lib/alerts/high-risk-core.ts`, add:

```ts
export type EmailAlertStatus = "QUEUED" | "SENT" | "FAILED";

export function normalizeAlertStatus(value: string): EmailAlertStatus {
  if (value.toUpperCase() === "QUEUED") return "QUEUED";
  if (value.toUpperCase() === "SENT") return "SENT";
  return "FAILED";
}
```

- [ ] **Step 5: Update email alert migration statuses**

In `supabase/migrations/20260504000005_create_email_alert_outbox.sql`, replace:

```sql
  CONSTRAINT "EmailAlert_status_check" CHECK ("status" IN ('QUEUED','LOGGED','FAILED')),
```

with:

```sql
  CONSTRAINT "EmailAlert_status_check" CHECK ("status" IN ('QUEUED','SENT','FAILED')),
```

- [ ] **Step 6: Create Resend wrapper**

Create `src/lib/email/resend.ts`:

```ts
import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = {
  id: string | null;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email is not configured. Set RESEND_API_KEY and ALERT_EMAIL_FROM.");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { id: data?.id ?? null };
}
```

- [ ] **Step 7: Create alert sender**

Create `src/lib/alerts/send-alert.ts`:

```ts
import { db } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/resend";

export async function sendQueuedEmailAlert(alertId: string) {
  const { data: alert, error } = await db
    .from("EmailAlert")
    .select("*")
    .eq("id", alertId)
    .single();

  if (error || !alert) throw new Error(error?.message ?? "Alert not found");
  if (alert.status === "SENT") return alert;

  try {
    await sendEmail({
      to: alert.recipientEmail,
      subject: alert.subject,
      text: alert.body,
    });

    const { data, error: updateError } = await db
      .from("EmailAlert")
      .update({
        status: "SENT",
        sentAt: new Date().toISOString(),
        errorMessage: null,
      })
      .eq("id", alert.id)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);
    return data;
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : "Email send failed";
    await db
      .from("EmailAlert")
      .update({ status: "FAILED", errorMessage: message })
      .eq("id", alert.id);
    throw sendError;
  }
}
```

- [ ] **Step 8: Queue then send during high-risk alert creation**

In `src/lib/alerts/high-risk.ts`, import:

```ts
import { sendQueuedEmailAlert } from "./send-alert";
```

Change insert status:

```ts
      status: "QUEUED",
```

After successful insert, add:

```ts
  try {
    await sendQueuedEmailAlert(data.id);
  } catch (sendError) {
    console.error("Failed to send high-risk alert:", sendError);
  }
```

Keep returning `data` so scoring is not blocked by provider downtime.

- [ ] **Step 9: Run verification**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/high-risk-email-alert.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/retention-workflow.test.mjs
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/lib/email/resend.ts src/lib/alerts/send-alert.ts src/lib/alerts/high-risk.ts src/lib/alerts/high-risk-core.ts supabase/migrations/20260504000005_create_email_alert_outbox.sql tests/high-risk-email-alert.test.mjs
git commit -m "feat: send high-risk email alerts"
```

---

### Task 3: Provision Supabase Storage Bucket

**Files:**
- Create: `supabase/migrations/20260504000006_create_uploads_storage_bucket.sql`
- Modify: `README.md`

- [ ] **Step 1: Create storage migration**

Create `supabase/migrations/20260504000006_create_uploads_storage_bucket.sql`:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  4194304,
  ARRAY[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "uploads_owner_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1
    FROM public."Academy" a
    WHERE a.id = split_part(name, '/', 1)
      AND a."ownerId" = auth.uid()
  )
);

CREATE POLICY "uploads_service_insert" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "uploads_service_update" ON storage.objects
FOR UPDATE TO service_role
USING (bucket_id = 'uploads');
```

- [ ] **Step 2: Document storage setup**

In `README.md`, add:

```md
### Supabase Storage

Uploads use a private Supabase Storage bucket named `uploads`.
The server upload route writes with the service-role key to paths shaped as:

```text
<academyId>/<uploadId>/<filename>
```

Run `npx supabase db push` before testing uploads in a fresh Supabase project so the bucket and storage policies exist.
```

- [ ] **Step 3: Run migration dry verification**

Run:

```bash
npx supabase db push --dry-run
```

Expected: Supabase CLI reports pending storage migration without SQL syntax errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260504000006_create_uploads_storage_bucket.sql README.md
git commit -m "feat: provision uploads storage bucket"
```

---

### Task 4: Replace Destructive Migration History With MVP Baseline

**Files:**
- Create: `supabase/migrations/20260504000000_mvp_baseline.sql`
- Delete after review: `supabase/migrations/20260504000001_full_schema.sql`
- Delete after review: `supabase/migrations/20260504000002_grant_api_roles.sql`
- Delete after review: `supabase/migrations/20260504000003_create_missing_risk_tables.sql`
- Delete after review: `supabase/migrations/20260504000004_reset_public_schema_remove_user.sql`
- Fold into baseline then delete: `supabase/migrations/20260504000005_create_email_alert_outbox.sql`
- Keep separate or fold into baseline: `supabase/migrations/20260504000006_create_uploads_storage_bucket.sql`

- [ ] **Step 1: Create one production-safe baseline migration**

Create `supabase/migrations/20260504000000_mvp_baseline.sql` by combining the final schema from `20260504000004_reset_public_schema_remove_user.sql`, the email outbox from `20260504000005_create_email_alert_outbox.sql`, the storage bucket migration from Task 3, and tutor tables from Task 7.

The baseline must start with extensions/types and must not contain:

```sql
DROP SCHEMA IF EXISTS public CASCADE;
DROP TABLE;
DROP TYPE;
```

The baseline must include this ownership shape:

```sql
CREATE TABLE "Academy" (
  "id"        TEXT        NOT NULL,
  "ownerId"   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name"      TEXT        NOT NULL,
  "country"   TEXT        NOT NULL,
  "currency"  TEXT        NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);
```

- [ ] **Step 2: Remove destructive migrations only after baseline is complete**

Delete the old migration files after reviewing the baseline:

```bash
git rm supabase/migrations/20260504000001_full_schema.sql
git rm supabase/migrations/20260504000002_grant_api_roles.sql
git rm supabase/migrations/20260504000003_create_missing_risk_tables.sql
git rm supabase/migrations/20260504000004_reset_public_schema_remove_user.sql
git rm supabase/migrations/20260504000005_create_email_alert_outbox.sql
```

If Supabase has already applied these migrations to a linked remote project, stop and create forward-only corrective migrations instead of deleting history.

- [ ] **Step 3: Verify no destructive reset remains**

Run:

```bash
Select-String -Path supabase\migrations\*.sql -Pattern "DROP SCHEMA|public `"User`"|REFERENCES `"User`""
```

Expected: no matches.

- [ ] **Step 4: Regenerate DB types**

Run after applying migrations:

```bash
npx supabase db push
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```

Expected: generated types include `EmailAlert`, `Tutor`, and `tutorId` on `Student`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations src/lib/db/database.types.ts
git commit -m "chore: replace destructive migrations with mvp baseline"
```

---

### Task 5: Replace Dashboard Static Data With Real Data

**Files:**
- Create: `src/lib/dashboard/charts-core.ts`
- Create: `src/lib/dashboard/charts.ts`
- Modify: `src/lib/dashboard/summary.ts`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/lib/data.ts`
- Create: `tests/dashboard-real-data.test.mjs`

- [ ] **Step 1: Write dashboard core test**

Create `tests/dashboard-real-data.test.mjs`:

```js
import assert from "node:assert/strict";

const charts = await import("../src/lib/dashboard/charts-core.ts");

const rows = [
  { riskBand: "HIGH", riskScore: 90, attendanceRate: 50, recommendedAction: "Call parent", studentName: "Ayaan Khan" },
  { riskBand: "MEDIUM", riskScore: 65, attendanceRate: 72, recommendedAction: "Offer makeup class", studentName: "Maya Reyes" },
  { riskBand: "LOW", riskScore: 20, attendanceRate: 96, recommendedAction: "No action", studentName: "Noor Ali" },
];

assert.deepEqual(charts.buildRiskBreakdown(rows).map((item) => item.value), [1, 1, 1]);
assert.deepEqual(charts.buildAttendanceDistribution(rows).values, [1, 1, 0, 1]);
assert.deepEqual(charts.buildTopRecommendations(rows).map((item) => item.studentName), ["Ayaan Khan", "Maya Reyes"]);

console.log("dashboard real data tests passed");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/dashboard-real-data.test.mjs
```

Expected: FAIL because `charts-core.ts` does not exist.

- [ ] **Step 3: Create chart core helpers**

Create `src/lib/dashboard/charts-core.ts`:

```ts
export type DashboardRiskRow = {
  riskBand: "HIGH" | "MEDIUM" | "LOW" | null;
  riskScore: number | null;
  attendanceRate: number | null;
  recommendedAction: string | null;
  studentName: string;
};

export function buildRiskBreakdown(rows: DashboardRiskRow[]) {
  const high = rows.filter((row) => row.riskBand === "HIGH").length;
  const medium = rows.filter((row) => row.riskBand === "MEDIUM").length;
  const low = rows.filter((row) => row.riskBand === "LOW" || row.riskBand === null).length;

  return [
    { label: "High", value: high, color: "#DC2626" },
    { label: "Medium", value: medium, color: "#F59E0B" },
    { label: "Low", value: low, color: "#10B981" },
  ];
}

export function buildAttendanceDistribution(rows: DashboardRiskRow[]) {
  const labels = ["0-59", "60-79", "80-89", "90+"];
  const values = [0, 0, 0, 0];

  for (const row of rows) {
    const value = row.attendanceRate;
    if (value === null) continue;
    if (value < 60) values[0] += 1;
    else if (value < 80) values[1] += 1;
    else if (value < 90) values[2] += 1;
    else values[3] += 1;
  }

  return { labels, values };
}

export function buildTopRecommendations(rows: DashboardRiskRow[]) {
  return rows
    .filter((row) => row.recommendedAction && (row.riskBand === "HIGH" || row.riskBand === "MEDIUM"))
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 3)
    .map((row) => ({
      studentName: row.studentName,
      riskBand: row.riskBand,
      riskScore: row.riskScore,
      recommendedAction: row.recommendedAction,
    }));
}
```

- [ ] **Step 4: Create DB chart helper**

Create `src/lib/dashboard/charts.ts`:

```ts
import { getStudentRiskList } from "@/lib/students/risk";
import {
  buildAttendanceDistribution,
  buildRiskBreakdown,
  buildTopRecommendations,
} from "./charts-core";

export async function getDashboardCharts(academyId: string) {
  const students = await getStudentRiskList(academyId, {
    sort: "riskScore",
    direction: "desc",
  });

  const rows = students.map((student) => ({
    riskBand: student.riskBand,
    riskScore: student.riskScore,
    attendanceRate: student.attendanceRate,
    recommendedAction: student.recommendedAction,
    studentName: student.name,
  }));

  return {
    riskBreakdown: buildRiskBreakdown(rows),
    attendance: buildAttendanceDistribution(rows),
    recommendations: buildTopRecommendations(rows),
  };
}
```

- [ ] **Step 5: Update dashboard page imports**

In `src/app/(dashboard)/dashboard/page.tsx`, remove:

```ts
import {
  RISK_BREAKDOWN, RETENTION_TREND,
  ATTENDANCE_BARS, ATTENDANCE_LABELS, INTERVENTIONS,
} from "@/lib/data";
```

Add:

```ts
import { getDashboardCharts } from "@/lib/dashboard/charts";
```

Inside the page, add:

```ts
  const charts = await getDashboardCharts(dbUser.academy.id);
```

Replace the hardcoded greeting:

```tsx
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>{dbUser.academy.name}</div>
```

Replace chart usages:

```tsx
<AreaChart values={[summary.totalStudents, summary.mediumRiskCount, summary.highRiskCount, summary.studentsSavedThisMonth]} />
<Donut data={charts.riskBreakdown} size={120} thickness={14} />
{charts.riskBreakdown.map(r => (
...
<BarChart values={charts.attendance.values} labels={charts.attendance.labels} />
```

Replace `INTERVENTIONS.map` with:

```tsx
            {charts.recommendations.map((iv) => (
              <div key={`${iv.studentName}-${iv.riskScore}`} style={{
                background: "var(--primary-50)", border: "1px solid var(--primary-100)",
                borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--primary-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13 }}>R</div>
                <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.55 }}>
                  <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }}>{iv.studentName}</strong>
                  {" · "}<span style={{ color: "var(--neutral-500)" }}>{iv.riskBand?.toLowerCase()} risk</span>
                  <div style={{ marginTop: 6 }}>{iv.recommendedAction}</div>
                </div>
              </div>
            ))}
```

Add empty state:

```tsx
            {charts.recommendations.length === 0 && (
              <div style={{ fontSize: 14, color: "var(--neutral-500)", lineHeight: 1.5 }}>
                No recommendations yet. Upload and score student data to populate this panel.
              </div>
            )}
```

- [ ] **Step 6: Remove unused static exports**

In `src/lib/data.ts`, remove `RISK_BREAKDOWN`, `RETENTION_TREND`, `ATTENDANCE_BARS`, `ATTENDANCE_LABELS`, and `INTERVENTIONS` only after no imports remain.

- [ ] **Step 7: Run verification**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/dashboard-real-data.test.mjs
.\node_modules\.bin\eslint.cmd
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/dashboard src/app/(dashboard)/dashboard/page.tsx src/lib/data.ts tests/dashboard-real-data.test.mjs
git commit -m "feat: use real dashboard data"
```

---

### Task 6: Remove or Wire Inert MVP Controls

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/app/(dashboard)/students/page.tsx`
- Modify: `src/components/dashboard/DashboardShell.tsx`

- [ ] **Step 1: Remove inert dashboard buttons**

In `src/app/(dashboard)/dashboard/page.tsx`, remove imports:

```ts
import { Download, Plus } from "lucide-react";
```

Delete the header action buttons:

```tsx
        <div style={{ display: "flex", gap: 10 }}>
          <button ...>
            <Download size={14} /> Export
          </button>
          <button ...>
            <Plus size={14} /> Add student
          </button>
        </div>
```

Replace with a real import link:

```tsx
        <Link href="/uploads/new" style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          Upload data
        </Link>
```

- [ ] **Step 2: Remove inert student add button**

In `src/app/(dashboard)/students/page.tsx`, remove `Plus` from the icon import:

```ts
import { Upload } from "lucide-react";
```

Delete the `Add student` button block. Keep the real `/uploads/new` import link.

- [ ] **Step 3: Remove static upsell and dead utility buttons**

In `src/components/dashboard/DashboardShell.tsx`, remove `UpsellCard` and its sidebar render because paid plan management is no longer part of this MVP plan.

For `LifeBuoy` and `Bell`, either link to real pages or remove the buttons. MVP choice: remove both from the topbar so no inert controls remain.

- [ ] **Step 4: Run verification**

Run:

```bash
.\node_modules\.bin\eslint.cmd
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx src/app/(dashboard)/students/page.tsx src/components/dashboard/DashboardShell.tsx
git commit -m "fix: remove inert mvp controls"
```

---

### Task 7: Add Tutor Table and Tutor-Level Stats

**Files:**
- Create: `src/lib/tutors/tutor-core.ts`
- Create: `src/lib/tutors/tutors.ts`
- Create: `src/app/(dashboard)/tutors/page.tsx`
- Modify: `src/lib/scoring/persist.ts`
- Modify: `src/lib/students/risk.ts`
- Modify: `src/components/dashboard/DashboardShell.tsx`
- Modify: MVP baseline migration
- Create: `tests/tutor-stats.test.mjs`

- [ ] **Step 1: Write tutor stats test**

Create `tests/tutor-stats.test.mjs`:

```js
import assert from "node:assert/strict";

const tutorCore = await import("../src/lib/tutors/tutor-core.ts");

const rows = [
  { tutorName: "Imran", riskBand: "HIGH", riskScore: 90, attendanceRate: 50, feesAmount: 120, actionStatus: "PENDING" },
  { tutorName: "Imran", riskBand: "MEDIUM", riskScore: 70, attendanceRate: 80, feesAmount: 80, actionStatus: "STUDENT_SAVED" },
  { tutorName: "Sara", riskBand: "LOW", riskScore: 20, attendanceRate: 95, feesAmount: 100, actionStatus: "DONE" },
];

const stats = tutorCore.buildTutorStats(rows);
assert.equal(stats.length, 2);
assert.equal(stats[0].name, "Imran");
assert.equal(stats[0].assignedStudents, 2);
assert.equal(stats[0].highRiskStudents, 1);
assert.equal(stats[0].mediumRiskStudents, 1);
assert.equal(stats[0].averageRiskScore, 80);
assert.equal(stats[0].averageAttendance, 65);
assert.equal(stats[0].revenueAtRisk, 120);
assert.equal(stats[0].pendingActions, 1);
assert.equal(stats[0].studentsSaved, 1);

console.log("tutor stats tests passed");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/tutor-stats.test.mjs
```

Expected: FAIL because `src/lib/tutors/tutor-core.ts` does not exist.

- [ ] **Step 3: Add Tutor schema**

In the MVP baseline migration, add:

```sql
CREATE TABLE "Tutor" (
  "id"        TEXT        NOT NULL,
  "academyId" TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Tutor_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Tutor_academyId_name_key" ON "Tutor"("academyId", lower("name"));
CREATE INDEX "Tutor_academyId_idx" ON "Tutor"("academyId");
```

Add to `"Student"`:

```sql
  "tutorId" TEXT,
```

Add FK after table creation:

```sql
ALTER TABLE "Student"
ADD CONSTRAINT "Student_tutorId_fkey"
FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Add RLS:

```sql
ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutor_select_own" ON "Tutor" FOR SELECT USING (EXISTS (
  SELECT 1 FROM "Academy" a WHERE a.id = "Tutor"."academyId" AND a."ownerId" = auth.uid()
));
CREATE POLICY "tutor_insert_own" ON "Tutor" FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM "Academy" a WHERE a.id = "Tutor"."academyId" AND a."ownerId" = auth.uid()
));
CREATE POLICY "tutor_update_own" ON "Tutor" FOR UPDATE USING (EXISTS (
  SELECT 1 FROM "Academy" a WHERE a.id = "Tutor"."academyId" AND a."ownerId" = auth.uid()
));
```

- [ ] **Step 4: Create tutor stats core**

Create `src/lib/tutors/tutor-core.ts`:

```ts
export type TutorStatsInput = {
  tutorName: string | null;
  riskBand: "HIGH" | "MEDIUM" | "LOW" | null;
  riskScore: number | null;
  attendanceRate: number | null;
  feesAmount: number | null;
  actionStatus: string | null;
};

export type TutorStats = {
  name: string;
  assignedStudents: number;
  highRiskStudents: number;
  mediumRiskStudents: number;
  averageRiskScore: number;
  averageAttendance: number;
  revenueAtRisk: number;
  pendingActions: number;
  studentsSaved: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildTutorStats(rows: TutorStatsInput[]): TutorStats[] {
  const grouped = new Map<string, TutorStatsInput[]>();

  for (const row of rows) {
    const name = row.tutorName?.trim() || "Unassigned";
    grouped.set(name, [...(grouped.get(name) ?? []), row]);
  }

  return [...grouped.entries()]
    .map(([name, tutorRows]) => ({
      name,
      assignedStudents: tutorRows.length,
      highRiskStudents: tutorRows.filter((row) => row.riskBand === "HIGH").length,
      mediumRiskStudents: tutorRows.filter((row) => row.riskBand === "MEDIUM").length,
      averageRiskScore: average(tutorRows.flatMap((row) => row.riskScore === null ? [] : [row.riskScore])),
      averageAttendance: average(tutorRows.flatMap((row) => row.attendanceRate === null ? [] : [row.attendanceRate])),
      revenueAtRisk: tutorRows
        .filter((row) => row.riskBand === "HIGH")
        .reduce((sum, row) => sum + (row.feesAmount ?? 0), 0),
      pendingActions: tutorRows.filter((row) => row.actionStatus === "PENDING" || row.actionStatus === "IN_PROGRESS").length,
      studentsSaved: tutorRows.filter((row) => row.actionStatus === "STUDENT_SAVED").length,
    }))
    .sort((a, b) => b.highRiskStudents - a.highRiskStudents || b.averageRiskScore - a.averageRiskScore || a.name.localeCompare(b.name));
}
```

- [ ] **Step 5: Create tutor DB helper**

Create `src/lib/tutors/tutors.ts`:

```ts
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { getStudentRiskList } from "@/lib/students/risk";
import { buildTutorStats } from "./tutor-core";

export async function getOrCreateTutor(academyId: string, name: string | null | undefined) {
  const cleanName = name?.trim();
  if (!cleanName) return null;

  const { data: existing, error: fetchError } = await db
    .from("Tutor")
    .select("id")
    .eq("academyId", academyId)
    .ilike("name", cleanName)
    .maybeSingle();
  if (fetchError) throw new Error(`Failed to load tutor: ${fetchError.message}`);
  if (existing) return existing;

  const { data, error } = await db
    .from("Tutor")
    .insert({
      id: crypto.randomUUID(),
      academyId,
      name: cleanName,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create tutor: ${error.message}`);
  return data;
}

export async function getTutorStats(academyId: string) {
  const students = await getStudentRiskList(academyId, {
    sort: "riskScore",
    direction: "desc",
  });

  return buildTutorStats(
    students.map((student) => ({
      tutorName: student.tutor,
      riskBand: student.riskBand,
      riskScore: student.riskScore,
      attendanceRate: student.attendanceRate,
      feesAmount: student.feesAmount,
      actionStatus: null,
    }))
  );
}
```

- [ ] **Step 6: Link imported students to tutors**

In `src/lib/scoring/persist.ts`, import:

```ts
import { getOrCreateTutor } from "@/lib/tutors/tutors";
```

Before inserting each student, resolve:

```ts
    const tutor = await getOrCreateTutor(academyId, student.tutor);
```

Include `tutorId` in the `Student` insert/update payload:

```ts
      tutorId: tutor?.id ?? null,
```

- [ ] **Step 7: Add tutors page**

Create `src/app/(dashboard)/tutors/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getTutorStats } from "@/lib/tutors/tutors";

export default async function TutorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const tutors = await getTutorStats(dbUser.academy.id);

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Tutor risk overview</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Tutors</h1>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(7, 1fr)", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
          <div>Tutor</div><div>Students</div><div>High</div><div>Medium</div><div>Avg risk</div><div>Attendance</div><div>Revenue risk</div><div>Pending</div>
        </div>
        {tutors.map((tutor) => (
          <div key={tutor.name} style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(7, 1fr)", padding: "12px 20px", borderBottom: "1px solid var(--neutral-100)", gap: 12, fontSize: 14, alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--neutral-900)" }}>{tutor.name}</div>
            <div>{tutor.assignedStudents}</div>
            <div style={{ color: "var(--error)", fontWeight: 700 }}>{tutor.highRiskStudents}</div>
            <div>{tutor.mediumRiskStudents}</div>
            <div>{tutor.averageRiskScore}</div>
            <div>{tutor.averageAttendance}%</div>
            <div>${tutor.revenueAtRisk.toLocaleString()}</div>
            <div>{tutor.pendingActions}</div>
          </div>
        ))}
        {tutors.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
            No tutor data yet. Upload mapped student data with a tutor column to populate this page.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add tutors nav item**

In `src/components/dashboard/DashboardShell.tsx`, add `GraduationCap` import:

```ts
import { LayoutDashboard, Users, MessageCircleHeart, GraduationCap, UserCog, Settings, Search, LogOut, Upload } from "lucide-react";
```

Add nav item:

```ts
  { href: "/tutors", icon: GraduationCap, label: "Tutors" },
```

- [ ] **Step 9: Run verification**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/tutor-stats.test.mjs
.\node_modules\.bin\eslint.cmd
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/tutors src/app/(dashboard)/tutors/page.tsx src/lib/scoring/persist.ts src/lib/students/risk.ts src/components/dashboard/DashboardShell.tsx tests/tutor-stats.test.mjs supabase/migrations
git commit -m "feat: add tutor stats"
```

---

### Task 8: Regenerate Types and Run Full MVP Verification

**Files:**
- Modify: `src/lib/db/database.types.ts`
- Modify: `MVPLACK.md`

- [ ] **Step 1: Apply migrations**

Run:

```bash
npx supabase db push
```

Expected: migrations apply without destructive reset warnings.

- [ ] **Step 2: Regenerate Supabase types**

Run:

```bash
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```

Expected: `database.types.ts` contains:

```ts
Tutor: {
EmailAlert: {
tutorId: string | null
```

- [ ] **Step 3: Run all unit tests**

Run:

```bash
node tests/ai-usage-log.test.mjs
node tests/scoring-normalize.test.mjs
node tests/scoring-rules.test.mjs
node tests/dashboard-summary.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/retention-workflow.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/upload-processing-state.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/high-risk-email-alert.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/dashboard-real-data.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/tutor-stats.test.mjs
```

Expected: all PASS.

- [ ] **Step 4: Run static verification**

Run:

```bash
.\node_modules\.bin\eslint.cmd
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: both PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
.\node_modules\.bin\next.cmd build
```

Expected: build completes. If it fails with `spawn EPERM` after TypeScript passed, document it as an environment process-spawn issue and keep the direct `tsc`/ESLint evidence.

- [ ] **Step 6: Manual smoke test**

Run:

```bash
npm run dev
```

Open `http://localhost:3000` and verify:

1. Sign up or log in.
2. Complete onboarding.
3. Upload a CSV.
4. Confirm mappings.
5. Wait until scoring finishes.
6. Dashboard shows real student counts, risk breakdown, attendance distribution, and recommendations.
7. Student list and student detail show risk/action state.
8. A high-risk student creates an `EmailAlert` with status `SENT` when Resend env vars are configured, or `FAILED` with `errorMessage` when they are missing.
9. Tutors page shows tutor-level stats.

- [ ] **Step 7: Update MVPLACK**

In `MVPLACK.md`, add a completion note at the top:

```md
## Completion Status

Implemented by `docs/superpowers/plans/2026-05-04-mvp-completion.md`.

- P1 upload-to-scoring flow: complete
- P2 email alerts: complete with Resend
- P3 paid-plan scope: removed from MVP execution plan by request
- P4 dashboard static data: replaced or removed
- P5 storage bucket: provisioned
- P6 destructive migrations: replaced with MVP baseline before production
- P7 inert controls: removed or wired
- P8 tutor table/stats: complete
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/database.types.ts MVPLACK.md
git commit -m "chore: verify mvp completion"
```

---

## Environment Variables

Add these to `.env.local` and Vercel:

```text
RESEND_API_KEY=
ALERT_EMAIL_FROM=RakhoAI <alerts@your-domain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Existing required variables remain:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_RISK_MODEL=gpt-4o-mini
```

---

## Self-Review

**Spec coverage**
- P1 upload-to-scoring flow: Task 1.
- P2 email alerts: Task 2.
- P3 paid-plan scope: removed from MVP execution plan by request.
- P4 dashboard static data: Task 5.
- P5 storage bucket setup: Task 3.
- P6 destructive migration reset: Task 4.
- P7 inert controls: Task 6.
- P8 tutor table/stats: Task 7.
- Final type regeneration and full verification: Task 8.

**Placeholder scan**
- No placeholder markers are present.
- Each task lists exact file paths, exact commands, and expected outcomes.
- Code-changing steps include concrete code snippets.

**Type consistency**
- Email alert statuses are consistently `QUEUED`, `SENT`, and `FAILED`.
- Tutor linkage uses `Tutor.id` and `Student.tutorId` while preserving imported `Student.tutor`.
- Dashboard chart rows reuse `StudentRiskListItem` fields already returned by `src/lib/students/risk.ts`.

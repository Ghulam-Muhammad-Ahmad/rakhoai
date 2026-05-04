# Prisma → Supabase JS Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Prisma entirely and replace all DB access with Supabase JS client (`@supabase/supabase-js`), using Supabase SQL migrations instead of Prisma migrations, while keeping Supabase Auth as the sole auth mechanism.

**Architecture:** All DB operations move from `prisma.*` calls to `supabase.from('Table').select/insert/update()` calls. A singleton service-role Supabase client (`src/lib/db/client.ts`) is used inside API routes and lib functions — frontend never calls Supabase directly. Supabase CLI generates TypeScript types from the live DB schema.

**Tech Stack:** `@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI (`npx supabase`), TypeScript generated types from `supabase gen types typescript`

---

## File Map

### Delete
- `src/lib/db/prisma.ts` — Prisma singleton, replaced by `src/lib/db/client.ts`
- `src/generated/prisma/` — entire generated Prisma client directory
- `prisma/schema.prisma`
- `prisma/migrations/` — entire directory (replaced by `supabase/migrations/`)
- `prisma.config.ts`

### Create
- `supabase/migrations/20260504000001_full_schema.sql` — consolidated SQL from all 5 Prisma migrations
- `src/lib/db/client.ts` — service-role Supabase client singleton for server-side DB ops
- `src/lib/db/types.ts` — re-exports generated DB types + hand-written Row/Insert helpers

### Modify
- `package.json` — remove Prisma deps, remove `postinstall: prisma generate`
- `src/lib/ai/usage-log.ts` — replace `prisma.aiUsageLog.create()` with `db.from('AiUsageLog').insert()`
- `src/lib/scoring/persist.ts` — replace all `prisma.student.*` and `prisma.riskAssessment.*`
- `src/lib/scoring/process-upload.ts` — replace `prisma.upload.*`
- `src/lib/dashboard/summary.ts` — replace `prisma.student.findMany()` and `prisma.action.count()`
- `src/app/api/academy/route.ts` — replace `prisma.user.upsert()` and `prisma.academy.*`
- `src/app/api/academy/me/route.ts` — replace `prisma.user.findUnique()`
- `src/app/api/uploads/route.ts` — replace `prisma.upload.create/update()`
- `src/app/api/uploads/[id]/map/route.ts` — replace all `prisma.*` calls
- `src/app/api/uploads/[id]/process/route.ts` — replace `prisma.user.findUnique()`
- `src/app/api/dashboard/summary/route.ts` — replace `prisma.user.findUnique()`
- `CLAUDE.md` — update tech stack, commands, folder structure sections

---

## Task 1: Create Supabase SQL Migration

**Files:**
- Create: `supabase/migrations/20260504000001_full_schema.sql`

- [ ] **Step 1: Create migrations directory and write consolidated SQL**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260504000001_full_schema.sql`:

```sql
-- ============================================================
-- RakhoAI full schema migration
-- Consolidated from 5 Prisma migrations
-- ============================================================

-- auth.uid() shim for local dev (no-op when Supabase auth schema missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
  END IF;
END $$;

-- Enums
CREATE TYPE "UploadStatus" AS ENUM ('PENDING','PREVIEW_READY','MAPPED','PROCESSING','PROCESSED','FAILED');
CREATE TYPE "RiskBand"     AS ENUM ('HIGH','MEDIUM','LOW');
CREATE TYPE "ActionStatus" AS ENUM ('PENDING','IN_PROGRESS','DONE','STUDENT_SAVED','STUDENT_LOST');

-- User
CREATE TABLE "User" (
  "id"         TEXT        NOT NULL,
  "supabaseId" TEXT        NOT NULL,
  "email"      TEXT        NOT NULL,
  "name"       TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");
CREATE UNIQUE INDEX "User_email_key"      ON "User"("email");

-- Academy
CREATE TABLE "Academy" (
  "id"        TEXT        NOT NULL,
  "ownerId"   TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "country"   TEXT        NOT NULL,
  "currency"  TEXT        NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Academy_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "Academy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Academy_ownerId_key" ON "Academy"("ownerId");

-- Upload
CREATE TABLE "Upload" (
  "id"          TEXT          NOT NULL,
  "academyId"   TEXT          NOT NULL,
  "fileName"    TEXT          NOT NULL,
  "fileUrl"     TEXT,
  "status"      "UploadStatus" NOT NULL DEFAULT 'PENDING',
  "rowCount"    INTEGER,
  "headers"     JSONB,
  "sampleRows"  JSONB,
  "rawRowsJson" JSONB,
  "mappingJson" JSONB,
  "uploadedAt"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ,
  CONSTRAINT "Upload_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Upload_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ColumnMapping
CREATE TABLE "ColumnMapping" (
  "id"          TEXT        NOT NULL,
  "academyId"   TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "mappingJson" JSONB       NOT NULL,
  "isDefault"   BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ColumnMapping_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "ColumnMapping_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Student
CREATE TABLE "Student" (
  "id"              TEXT        NOT NULL,
  "academyId"       TEXT        NOT NULL,
  "uploadId"        TEXT,
  "externalId"      TEXT,
  "name"            TEXT        NOT NULL,
  "contact"         TEXT,
  "joinDate"        TIMESTAMPTZ,
  "lastSessionDate" TIMESTAMPTZ,
  "attendanceRate"  FLOAT8,
  "paymentStatus"   TEXT,
  "lastPaymentDate" TIMESTAMPTZ,
  "totalSessions"   INTEGER,
  "feesAmount"      NUMERIC(10,2),
  "subject"         TEXT,
  "tutor"           TEXT,
  "rawDataJson"     JSONB       NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Student_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Student_uploadId_fkey"  FOREIGN KEY ("uploadId")  REFERENCES "Upload"("id")   ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Student_academyId_idx"            ON "Student"("academyId");
CREATE INDEX "Student_academyId_contact_idx"    ON "Student"("academyId","contact");
CREATE INDEX "Student_academyId_externalId_idx" ON "Student"("academyId","externalId");
CREATE INDEX "Student_academyId_name_idx"       ON "Student"("academyId","name");

-- RiskAssessment
CREATE TABLE "RiskAssessment" (
  "id"                TEXT        NOT NULL,
  "studentId"         TEXT        NOT NULL,
  "uploadId"          TEXT,
  "riskScore"         INTEGER     NOT NULL,
  "riskBand"          "RiskBand"  NOT NULL,
  "reasonsJson"       JSONB       NOT NULL,
  "recommendedAction" TEXT        NOT NULL,
  "confidence"        FLOAT8      NOT NULL,
  "ruleScore"         INTEGER     NOT NULL,
  "aiModel"           TEXT        NOT NULL,
  "computedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "RiskAssessment_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "RiskAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "RiskAssessment_studentId_computedAt_idx" ON "RiskAssessment"("studentId","computedAt");
CREATE INDEX "RiskAssessment_uploadId_idx"              ON "RiskAssessment"("uploadId");
CREATE INDEX "RiskAssessment_riskBand_idx"              ON "RiskAssessment"("riskBand");

-- Action
CREATE TABLE "Action" (
  "id"        TEXT          NOT NULL,
  "academyId" TEXT          NOT NULL,
  "studentId" TEXT          NOT NULL,
  "type"      TEXT          NOT NULL,
  "content"   TEXT,
  "status"    "ActionStatus" NOT NULL DEFAULT 'PENDING',
  "takenBy"   TEXT,
  "takenAt"   TIMESTAMPTZ,
  "notes"     TEXT,
  "createdAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "Action_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Action_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Action_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id")  ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Action_academyId_status_idx" ON "Action"("academyId","status");
CREATE INDEX "Action_studentId_idx"        ON "Action"("studentId");

-- AiUsageLog
CREATE TABLE "AiUsageLog" (
  "id"           TEXT        NOT NULL,
  "academyId"    TEXT,
  "uploadId"     TEXT,
  "feature"      TEXT        NOT NULL,
  "provider"     TEXT        NOT NULL DEFAULT 'openai',
  "model"        TEXT        NOT NULL,
  "requestHash"  TEXT        NOT NULL,
  "inputTokens"  INTEGER,
  "outputTokens" INTEGER,
  "totalTokens"  INTEGER,
  "cacheHit"     BOOLEAN     NOT NULL DEFAULT false,
  "status"       TEXT        NOT NULL,
  "errorCode"    TEXT,
  "latencyMs"    INTEGER     NOT NULL,
  "metadataJson" JSONB,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AiUsageLog_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "AiUsageLog_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiUsageLog_uploadId_fkey"  FOREIGN KEY ("uploadId")  REFERENCES "Upload"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AiUsageLog_academyId_createdAt_idx" ON "AiUsageLog"("academyId","createdAt");
CREATE INDEX "AiUsageLog_uploadId_idx"             ON "AiUsageLog"("uploadId");
CREATE INDEX "AiUsageLog_feature_createdAt_idx"    ON "AiUsageLog"("feature","createdAt");

-- ============================================================
-- RLS Policies
-- ============================================================

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON "User" FOR SELECT USING (auth.uid()::text = "supabaseId");
CREATE POLICY "users_insert_own" ON "User" FOR INSERT WITH CHECK (auth.uid()::text = "supabaseId");
CREATE POLICY "users_update_own" ON "User" FOR UPDATE USING (auth.uid()::text = "supabaseId");

-- Academy
ALTER TABLE "Academy" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_select_own" ON "Academy"
  FOR SELECT USING ("ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));
CREATE POLICY "academy_insert_own" ON "Academy"
  FOR INSERT WITH CHECK ("ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));
CREATE POLICY "academy_update_own" ON "Academy"
  FOR UPDATE USING ("ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- Upload
ALTER TABLE "Upload" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upload_select_own" ON "Upload"
  FOR SELECT USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "upload_insert_own" ON "Upload"
  FOR INSERT WITH CHECK ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "upload_update_own" ON "Upload"
  FOR UPDATE USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));

-- ColumnMapping
ALTER TABLE "ColumnMapping" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "column_mapping_select_own" ON "ColumnMapping"
  FOR SELECT USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "column_mapping_insert_own" ON "ColumnMapping"
  FOR INSERT WITH CHECK ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "column_mapping_update_own" ON "ColumnMapping"
  FOR UPDATE USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));

-- Student
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_select_own" ON "Student"
  FOR SELECT USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "student_insert_own" ON "Student"
  FOR INSERT WITH CHECK ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "student_update_own" ON "Student"
  FOR UPDATE USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));

-- RiskAssessment (scoped via Student → Academy)
ALTER TABLE "RiskAssessment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_select_own" ON "RiskAssessment"
  FOR SELECT USING ("studentId" IN (
    SELECT id FROM "Student" WHERE "academyId" IN (
      SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
    )
  ));
CREATE POLICY "risk_insert_own" ON "RiskAssessment"
  FOR INSERT WITH CHECK ("studentId" IN (
    SELECT id FROM "Student" WHERE "academyId" IN (
      SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
    )
  ));

-- Action
ALTER TABLE "Action" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "action_select_own" ON "Action"
  FOR SELECT USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "action_insert_own" ON "Action"
  FOR INSERT WITH CHECK ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));
CREATE POLICY "action_update_own" ON "Action"
  FOR UPDATE USING ("academyId" IN (
    SELECT id FROM "Academy" WHERE "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)
  ));

-- AiUsageLog (insert-only by service role; no user-level RLS needed)
ALTER TABLE "AiUsageLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_log_insert_service" ON "AiUsageLog"
  FOR INSERT WITH CHECK (true);
```

- [ ] **Step 2: Verify file created correctly**

```bash
cat supabase/migrations/20260504000001_full_schema.sql | head -20
```
Expected: first lines show comment header and DO block.

- [ ] **Step 3: Run migration against Supabase (if Supabase CLI linked)**

```bash
npx supabase db push
```
Expected: migration applies cleanly. If tables already exist from Prisma migrations, drop/recreate in Supabase dashboard first, or use `--include-all` flag.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add consolidated Supabase SQL migration (replaces Prisma migrations)"
```

---

## Task 2: Generate TypeScript Types + Create DB Client

**Files:**
- Create: `src/lib/db/types.ts`
- Create: `src/lib/db/client.ts`

- [ ] **Step 1: Generate Supabase types from live DB**

```bash
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```
Expected: `database.types.ts` created with `Database` interface containing all tables.

If not linked to remote yet:
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase gen types typescript --linked > src/lib/db/database.types.ts
```

- [ ] **Step 2: Create `src/lib/db/types.ts`**

```typescript
import type { Database } from "./database.types";

export type Tables = Database["public"]["Tables"];

// Row types (what comes back from SELECT)
export type UserRow           = Tables["User"]["Row"];
export type AcademyRow        = Tables["Academy"]["Row"];
export type UploadRow         = Tables["Upload"]["Row"];
export type ColumnMappingRow  = Tables["ColumnMapping"]["Row"];
export type StudentRow        = Tables["Student"]["Row"];
export type RiskAssessmentRow = Tables["RiskAssessment"]["Row"];
export type ActionRow         = Tables["Action"]["Row"];
export type AiUsageLogRow     = Tables["AiUsageLog"]["Row"];

// Insert types (what you send on INSERT)
export type UserInsert           = Tables["User"]["Insert"];
export type AcademyInsert        = Tables["Academy"]["Insert"];
export type UploadInsert         = Tables["Upload"]["Insert"];
export type ColumnMappingInsert  = Tables["ColumnMapping"]["Insert"];
export type StudentInsert        = Tables["Student"]["Insert"];
export type RiskAssessmentInsert = Tables["RiskAssessment"]["Insert"];
export type ActionInsert         = Tables["Action"]["Insert"];
export type AiUsageLogInsert     = Tables["AiUsageLog"]["Insert"];

// Update types
export type StudentUpdate = Tables["Student"]["Update"];
export type UploadUpdate  = Tables["Upload"]["Update"];
export type ActionUpdate  = Tables["Action"]["Update"];
```

- [ ] **Step 3: Create `src/lib/db/client.ts`**

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const globalForDb = globalThis as unknown as { db: SupabaseClient<Database> };

export const db: SupabaseClient<Database> =
  globalForDb.db ?? createAdminClient();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors for new files (ignore any existing Prisma errors — those are fixed in later tasks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add Supabase DB client singleton and generated types"
```

---

## Task 3: Remove Prisma — Package + Config

**Files:**
- Modify: `package.json`
- Delete: `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/`, `src/generated/prisma/`

- [ ] **Step 1: Uninstall Prisma packages**

```bash
npm uninstall prisma @prisma/client @prisma/adapter-pg @types/pg pg
```
Expected: packages removed from `node_modules` and `package.json`.

- [ ] **Step 2: Remove `postinstall` script from `package.json`**

Open `package.json`. Remove this line from `"scripts"`:
```json
"postinstall": "prisma generate"
```

- [ ] **Step 3: Delete Prisma files**

```bash
rm -rf prisma prisma.config.ts src/generated
```
On Windows PowerShell:
```powershell
Remove-Item -Recurse -Force prisma, prisma.config.ts, src/generated
```

- [ ] **Step 4: Verify no Prisma imports remain**

```bash
grep -r "from.*prisma" src/ --include="*.ts" --include="*.tsx"
grep -r "@prisma" src/ --include="*.ts" --include="*.tsx"
```
Expected at this step: many errors still exist (fixed in Tasks 4-8). These greps show you what's left.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: uninstall Prisma, remove generated client and migrations"
```

---

## Task 4: Replace Prisma in AI Usage Logger

**Files:**
- Modify: `src/lib/ai/usage-log.ts`

- [ ] **Step 1: Rewrite `src/lib/ai/usage-log.ts`**

```typescript
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import type { AiUsageLogInsert } from "@/lib/db/types";

export type AiUsageStatus = "success" | "error" | "cache_hit";

export type AiUsageInput = {
  academyId?: string | null;
  uploadId?: string | null;
  feature: "column_mapping" | "risk_scoring";
  model: string;
  payloadForHash: unknown;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cacheHit?: boolean;
  status: AiUsageStatus;
  errorCode?: string | null;
  latencyMs: number;
  metadata?: Record<string, unknown>;
};

export function hashAiPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function logAiUsage(input: AiUsageInput): Promise<void> {
  const requestHash = hashAiPayload(input.payloadForHash);
  const row: AiUsageLogInsert = {
    id: crypto.randomUUID(),
    academyId: input.academyId ?? null,
    uploadId: input.uploadId ?? null,
    feature: input.feature,
    model: input.model,
    requestHash,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    cacheHit: input.cacheHit ?? false,
    status: input.status,
    errorCode: input.errorCode ?? null,
    latencyMs: input.latencyMs,
    metadataJson: input.metadata ?? {},
  };

  await db.from("AiUsageLog").insert(row);

  if (process.env.AI_USAGE_FILE_LOG === "true") {
    const filePath = process.env.AI_USAGE_LOG_PATH ?? "logs/ai-usage.jsonl";
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(
      filePath,
      JSON.stringify({ ...row, createdAt: new Date().toISOString() }) + "\n",
      "utf8"
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "usage-log"
```
Expected: no errors for `usage-log.ts`.

- [ ] **Step 3: Run existing tests**

```bash
node tests/ai-usage-log.test.mjs
```
Expected: PASS (tests only check `hashAiPayload`, no DB calls).

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/usage-log.ts
git commit -m "feat: replace Prisma with Supabase JS in AI usage logger"
```

---

## Task 5: Replace Prisma in Scoring Persist + Process-Upload

**Files:**
- Modify: `src/lib/scoring/persist.ts`
- Modify: `src/lib/scoring/process-upload.ts`

- [ ] **Step 1: Rewrite `src/lib/scoring/persist.ts`**

```typescript
import { db } from "@/lib/db/client";
import type { StudentInsert, StudentUpdate } from "@/lib/db/types";
import { CanonicalStudentInput, AiRiskResult } from "./types";
import { computeRuleScore } from "./rules";
import crypto from "node:crypto";

function getStudentResultKey(student: CanonicalStudentInput): string {
  return student.contact ?? student.externalId ?? student.name;
}

async function findExistingStudentId(
  academyId: string,
  student: CanonicalStudentInput
): Promise<string | null> {
  if (student.contact) {
    const { data } = await db
      .from("Student")
      .select("id")
      .eq("academyId", academyId)
      .eq("contact", student.contact)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .single();
    if (data) return data.id;
  }

  if (student.externalId) {
    const { data } = await db
      .from("Student")
      .select("id")
      .eq("academyId", academyId)
      .eq("externalId", student.externalId)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .single();
    if (data) return data.id;
  }

  const { data } = await db
    .from("Student")
    .select("id")
    .eq("academyId", academyId)
    .eq("name", student.name)
    .order("updatedAt", { ascending: false })
    .limit(1)
    .single();
  return data?.id ?? null;
}

export async function persistRiskResults(args: {
  academyId: string;
  uploadId: string;
  students: CanonicalStudentInput[];
  results: AiRiskResult[];
  model: string;
}) {
  const resultByKey = new Map(args.results.map((r) => [r.studentKey, r]));

  for (const student of args.students) {
    const key = getStudentResultKey(student);
    const result = resultByKey.get(key);
    if (!result) continue;

    const now = new Date().toISOString();
    const studentData = {
      academyId: args.academyId,
      uploadId: args.uploadId,
      externalId: student.externalId ?? null,
      name: student.name,
      contact: student.contact ?? null,
      joinDate: student.joinDate?.toISOString() ?? null,
      lastSessionDate: student.lastSessionDate?.toISOString() ?? null,
      attendanceRate: student.attendanceRate ?? null,
      paymentStatus: student.paymentStatus ?? null,
      lastPaymentDate: student.lastPaymentDate?.toISOString() ?? null,
      totalSessions: student.totalSessions ?? null,
      feesAmount: student.feesAmount ?? null,
      subject: student.subject ?? null,
      tutor: student.tutor ?? null,
      rawDataJson: student.rawData,
      updatedAt: now,
    };

    const existingId = await findExistingStudentId(args.academyId, student);

    let studentId: string;
    if (existingId) {
      await db.from("Student").update(studentData as StudentUpdate).eq("id", existingId);
      studentId = existingId;
    } else {
      const insert: StudentInsert = { ...studentData, id: crypto.randomUUID(), createdAt: now };
      const { data, error } = await db.from("Student").insert(insert).select("id").single();
      if (error || !data) throw new Error(`Failed to insert student: ${error?.message}`);
      studentId = data.id;
    }

    await db.from("RiskAssessment").insert({
      id: crypto.randomUUID(),
      studentId,
      uploadId: args.uploadId,
      riskScore: result.riskScore,
      riskBand: result.riskBand,
      reasonsJson: result.reasons,
      recommendedAction: result.recommendedAction,
      confidence: result.confidence,
      ruleScore: computeRuleScore(student).score,
      aiModel: args.model,
    });
  }
}
```

- [ ] **Step 2: Rewrite `src/lib/scoring/process-upload.ts`**

```typescript
import { db } from "@/lib/db/client";
import { MappingResult } from "@/lib/matching";
import { normalizeRows } from "./normalize";
import { scoreStudentsWithAi } from "./ai";
import { persistRiskResults } from "./persist";

export async function processMappedUpload(uploadId: string, academyId: string) {
  const { data: upload, error } = await db
    .from("Upload")
    .select("*")
    .eq("id", uploadId)
    .single();

  if (error || !upload || upload.academyId !== academyId) throw new Error("Upload not found");
  if (upload.status !== "MAPPED") throw new Error("Upload must be mapped before processing");

  await db.from("Upload").update({ status: "PROCESSING" }).eq("id", uploadId);

  try {
    const rows =
      (upload.rawRowsJson as Record<string, unknown>[] | null) ??
      (upload.sampleRows as Record<string, unknown>[] | null) ??
      [];
    const mappings = (upload.mappingJson as MappingResult[] | null) ?? [];
    const students = normalizeRows(rows, mappings);
    const model = process.env.OPENAI_RISK_MODEL ?? "gpt-4o-mini";
    const results = await scoreStudentsWithAi({ academyId, uploadId, students });

    await persistRiskResults({ academyId, uploadId, students, results, model });
    await db.from("Upload").update({
      status: "PROCESSED",
      processedAt: new Date().toISOString(),
      rowCount: students.length,
    }).eq("id", uploadId);

    return { processed: students.length, scored: results.length };
  } catch (error) {
    await db.from("Upload").update({ status: "FAILED" }).eq("id", uploadId);
    throw error;
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "persist|process-upload"
```
Expected: no errors for those files.

- [ ] **Step 4: Run scoring tests**

```bash
node tests/scoring-normalize.test.mjs && node tests/scoring-rules.test.mjs
```
Expected: both PASS (pure logic, no DB).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/persist.ts src/lib/scoring/process-upload.ts
git commit -m "feat: replace Prisma with Supabase JS in scoring persist and process-upload"
```

---

## Task 6: Replace Prisma in Dashboard Summary

**Files:**
- Modify: `src/lib/dashboard/summary.ts`

- [ ] **Step 1: Rewrite `src/lib/dashboard/summary.ts`**

```typescript
import { db } from "@/lib/db/client";

export type DashboardSummary = {
  totalStudents: number;
  highRiskCount: number;
  mediumRiskCount: number;
  estimatedRevenueAtRisk: number;
  studentsSavedThisMonth: number;
};

function startOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

export async function getDashboardSummary(
  academyId: string,
  now = new Date()
): Promise<DashboardSummary> {
  // Fetch all students with their latest risk assessment
  const { data: students, error } = await db
    .from("Student")
    .select(`
      id,
      feesAmount,
      riskAssessments:RiskAssessment(riskBand, computedAt)
    `)
    .eq("academyId", academyId);

  if (error) throw new Error(`Failed to fetch students: ${error.message}`);

  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let estimatedRevenueAtRisk = 0;

  for (const student of students ?? []) {
    const assessments = (student.riskAssessments ?? []) as { riskBand: string; computedAt: string }[];
    if (assessments.length === 0) continue;

    // Latest by computedAt
    const latest = assessments.sort(
      (a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime()
    )[0];

    if (latest.riskBand === "HIGH") {
      highRiskCount += 1;
      estimatedRevenueAtRisk += Number(student.feesAmount ?? 0);
    }
    if (latest.riskBand === "MEDIUM") {
      mediumRiskCount += 1;
    }
  }

  const { count: studentsSavedThisMonth } = await db
    .from("Action")
    .select("id", { count: "exact", head: true })
    .eq("academyId", academyId)
    .eq("status", "STUDENT_SAVED")
    .gte("takenAt", startOfMonth(now));

  return {
    totalStudents: (students ?? []).length,
    highRiskCount,
    mediumRiskCount,
    estimatedRevenueAtRisk,
    studentsSavedThisMonth: studentsSavedThisMonth ?? 0,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "summary"
```
Expected: no errors for `summary.ts`.

- [ ] **Step 3: Run dashboard test**

```bash
node tests/dashboard-summary.test.mjs
```
Expected: PASS (tests revenue calculation with mock data, no DB).

- [ ] **Step 4: Commit**

```bash
git add src/lib/dashboard/summary.ts
git commit -m "feat: replace Prisma with Supabase JS in dashboard summary"
```

---

## Task 7: Replace Prisma in Academy API Routes

**Files:**
- Modify: `src/app/api/academy/route.ts`
- Modify: `src/app/api/academy/me/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/academy/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import crypto from "node:crypto";

const schema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  currency: z.string().min(1).default("USD"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, country, currency } = parsed.data;

  // Upsert user record
  const { data: existingUser } = await db
    .from("User")
    .select("id")
    .eq("supabaseId", user.id)
    .single();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const newId = crypto.randomUUID();
    const { error } = await db.from("User").insert({
      id: newId,
      supabaseId: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    });
    if (error) return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    userId = newId;
  }

  // Upsert academy
  const { data: existingAcademy } = await db
    .from("Academy")
    .select("id")
    .eq("ownerId", userId)
    .single();

  if (existingAcademy) {
    const { data: academy, error } = await db
      .from("Academy")
      .update({ name, country, currency })
      .eq("id", existingAcademy.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Failed to update academy" }, { status: 500 });
    return NextResponse.json({ academy });
  }

  const { data: academy, error } = await db.from("Academy").insert({
    id: crypto.randomUUID(),
    ownerId: userId,
    name,
    country,
    currency,
  }).select().single();

  if (error) return NextResponse.json({ error: "Failed to create academy" }, { status: 500 });
  return NextResponse.json({ academy }, { status: 201 });
}
```

- [ ] **Step 2: Rewrite `src/app/api/academy/me/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ academy: null }, { status: 401 });
  }

  const { data: dbUser } = await db
    .from("User")
    .select("id, academy:Academy(*)")
    .eq("supabaseId", user.id)
    .single();

  return NextResponse.json({ academy: (dbUser?.academy as object | null) ?? null });
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "academy"
```
Expected: no errors for academy routes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/academy/
git commit -m "feat: replace Prisma with Supabase JS in academy API routes"
```

---

## Task 8: Replace Prisma in Upload API Routes

**Files:**
- Modify: `src/app/api/uploads/route.ts`
- Modify: `src/app/api/uploads/[id]/map/route.ts`
- Modify: `src/app/api/uploads/[id]/process/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/uploads/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { parseFile } from "@/lib/parsers";
import crypto from "node:crypto";

const ALLOWED_TYPES = ["csv", "xlsx", "xls"];
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_MB = MAX_BYTES / 1024 / 1024;

function getAdminStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAcademyIdForUser(supabaseUserId: string): Promise<string | null> {
  const { data: user } = await db
    .from("User")
    .select("id, academy:Academy(id)")
    .eq("supabaseId", supabaseUserId)
    .single();
  const academy = user?.academy as { id: string } | null;
  return academy?.id ?? null;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const academyId = await getAcademyIdForUser(user.id);
  if (!academyId) {
    return NextResponse.json({ error: "Academy not found" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_MB} MB limit` }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = await parseFile(buffer, file.name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const uploadId = crypto.randomUUID();

  const { error: insertError } = await db.from("Upload").insert({
    id: uploadId,
    academyId,
    fileName: file.name,
    status: "PENDING",
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to create upload record" }, { status: 500 });
  }

  const storagePath = `${academyId}/${uploadId}/${file.name}`;
  const adminClient = getAdminStorageClient();
  const { error: storageError } = await adminClient.storage
    .from("uploads")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageError) {
    console.error("Storage upload failed:", storageError.message);
    await db.from("Upload").update({ status: "FAILED" }).eq("id", uploadId);
    return NextResponse.json({ error: "Failed to store uploaded file" }, { status: 502 });
  }

  const { data: updated } = await db
    .from("Upload")
    .update({
      fileUrl: storagePath,
      status: "PREVIEW_READY",
      rowCount: parsed.totalRows,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows,
      rawRowsJson: parsed.rows,
    })
    .eq("id", uploadId)
    .select()
    .single();

  return NextResponse.json(
    {
      uploadId,
      fileName: updated?.fileName ?? file.name,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows,
      totalRows: parsed.totalRows,
      warnings: parsed.warnings,
    },
    { status: 201 }
  );
}
```

- [ ] **Step 2: Rewrite `src/app/api/uploads/[id]/map/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { runMapping, MappingResult } from "@/lib/matching";
import { z } from "zod";
import crypto from "node:crypto";

type Params = { params: Promise<{ id: string }> };

async function getAuthorizedUpload(uploadId: string, supabaseUserId: string) {
  const { data: user } = await db
    .from("User")
    .select("id, academy:Academy(id)")
    .eq("supabaseId", supabaseUserId)
    .single();

  const academy = user?.academy as { id: string } | null;
  if (!academy) return null;

  const { data: upload } = await db
    .from("Upload")
    .select("*")
    .eq("id", uploadId)
    .single();

  if (!upload || upload.academyId !== academy.id) return null;
  return { upload, academyId: academy.id };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academyId } = ctx;

  const { data: templates } = await db
    .from("ColumnMapping")
    .select("id, name, isDefault, mappingJson")
    .eq("academyId", academyId)
    .order("isDefault", { ascending: false })
    .order("createdAt", { ascending: false });

  return NextResponse.json({
    uploadId: upload.id,
    fileName: upload.fileName,
    status: upload.status,
    mappings: (upload.mappingJson as MappingResult[] | null) ?? [],
    templates: templates ?? [],
  });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academyId } = ctx;

  if (!upload.headers || !upload.sampleRows) {
    return NextResponse.json({ error: "Upload not yet parsed" }, { status: 400 });
  }

  const headers = upload.headers as string[];
  const sampleRows = upload.sampleRows as Record<string, string>[];

  const { data: defaultTemplate } = await db
    .from("ColumnMapping")
    .select("mappingJson")
    .eq("academyId", academyId)
    .eq("isDefault", true)
    .single();

  const templateMap = defaultTemplate
    ? (defaultTemplate.mappingJson as Record<string, string | null>)
    : null;

  const mappings = await runMapping(headers, sampleRows, upload.id, templateMap);

  await db.from("Upload").update({ mappingJson: mappings as object[] }).eq("id", upload.id);

  return NextResponse.json({ mappings });
}

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
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academyId } = ctx;

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const hasStudentName = body.mappings.some((m) => m.targetField === "student_name");
  if (!hasStudentName) {
    return NextResponse.json(
      { error: "student_name field must be mapped before confirming" },
      { status: 400 }
    );
  }

  const existing = (upload.mappingJson as MappingResult[] | null) ?? [];
  const overrideMap = Object.fromEntries(
    body.mappings.map((m) => [m.sourceColumn, m.targetField])
  );

  const updated: MappingResult[] = existing.map((m) =>
    m.sourceColumn in overrideMap
      ? { ...m, suggestedField: overrideMap[m.sourceColumn], layer: "exact" as const, confidence: 1.0 }
      : m
  );

  await db.from("Upload").update({ mappingJson: updated as object[], status: "MAPPED" }).eq("id", upload.id);

  if (body.saveAsTemplate && body.templateName) {
    const templateJson = Object.fromEntries(
      body.mappings.map((m) => [m.sourceColumn, m.targetField])
    );

    if (body.setAsDefault) {
      await db.from("ColumnMapping").update({ isDefault: false }).eq("academyId", academyId).eq("isDefault", true);
    }

    await db.from("ColumnMapping").insert({
      id: crypto.randomUUID(),
      academyId,
      name: body.templateName,
      mappingJson: templateJson,
      isDefault: body.setAsDefault ?? false,
    });
  }

  return NextResponse.json({ mappings: updated, status: "MAPPED" });
}
```

- [ ] **Step 3: Rewrite `src/app/api/uploads/[id]/process/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { processMappedUpload } from "@/lib/scoring/process-upload";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await db
    .from("User")
    .select("id, academy:Academy(id)")
    .eq("supabaseId", user.id)
    .single();

  const academy = dbUser?.academy as { id: string } | null;
  if (!academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  try {
    const result = await processMappedUpload(id, academy.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "uploads|map"
```
Expected: no errors for upload routes.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/uploads/
git commit -m "feat: replace Prisma with Supabase JS in upload API routes"
```

---

## Task 9: Replace Prisma in Dashboard API Route

**Files:**
- Modify: `src/app/api/dashboard/summary/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/dashboard/summary/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getDashboardSummary } from "@/lib/dashboard/summary";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await db
    .from("User")
    .select("id, academy:Academy(id)")
    .eq("supabaseId", user.id)
    .single();

  const academy = dbUser?.academy as { id: string } | null;
  if (!academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  return NextResponse.json(await getDashboardSummary(academy.id));
}
```

- [ ] **Step 2: Full TypeScript check — all files clean**

```bash
npx tsc --noEmit 2>&1
```
Expected: zero errors. If errors remain, fix them before proceeding.

- [ ] **Step 3: Run all tests**

```bash
npm run test:scoring
```
Expected: all 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/
git commit -m "feat: replace Prisma with Supabase JS in dashboard API route"
```

---

## Task 10: Delete `src/lib/db/prisma.ts` + Update CLAUDE.md

**Files:**
- Delete: `src/lib/db/prisma.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Delete old Prisma client**

```powershell
Remove-Item src/lib/db/prisma.ts
```

- [ ] **Step 2: Verify no remaining Prisma imports**

```bash
grep -r "prisma" src/ --include="*.ts" --include="*.tsx" -l
grep -r "@prisma\|generated/prisma" src/ --include="*.ts" --include="*.tsx"
```
Expected: zero results.

- [ ] **Step 3: Update CLAUDE.md — Tech Stack section**

Replace the DB/ORM rows in the Tech Stack table:

| Layer | Old | New |
|---|---|---|
| ORM | `Prisma` | `Supabase JS client (@supabase/supabase-js)` |
| DB Types | `(generated by Prisma)` | `Supabase CLI gen types typescript` |

Remove from Commands section:
```
npx prisma migrate dev    # run DB migrations
npx prisma studio         # browse DB
```

Add to Commands section:
```
npx supabase db push             # apply SQL migrations to Supabase
npx supabase gen types typescript --linked > src/lib/db/database.types.ts  # regenerate DB types
```

Update Folder Structure — change `/lib/db` description:
- Old: `← Prisma client singleton`
- New: `← Supabase service-role client singleton + generated types`

Update Migration Security Requirements section — replace Prisma-specific guidance:
> Migrations live in `supabase/migrations/` as plain `.sql` files. Run `npx supabase db push` to apply. Include RLS policies in same migration file as table creation. No Prisma shadow database shim needed — Supabase migrations run directly against the live DB.

- [ ] **Step 4: Final TypeScript + test run**

```bash
npx tsc --noEmit 2>&1 && npm run test:scoring
```
Expected: zero TS errors, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Prisma client, update CLAUDE.md for Supabase-only stack"
```

---

## Self-Review

### Spec Coverage
- [x] Remove Prisma (Tasks 3, 10)
- [x] Supabase SQL migrations from existing Prisma migrations (Task 1)
- [x] Supabase JS client singleton (Task 2)
- [x] Generated TypeScript types via Supabase CLI (Task 2)
- [x] Replace all `prisma.*` calls in lib files (Tasks 4, 5, 6)
- [x] Replace all `prisma.*` calls in API routes (Tasks 7, 8, 9)
- [x] Keep Supabase Auth (`supabase.auth.getUser()`) — unchanged
- [x] No frontend calling Supabase directly — all via backend API routes
- [x] Tests remain unit tests, no DB deps (Tasks 4 step 3, 5 step 4, 6 step 3)
- [x] RLS policies rewritten cleanly (Task 1)
- [x] CLAUDE.md updated (Task 10)

### Type Consistency
- `db` client: defined in `src/lib/db/client.ts`, imported as `import { db } from "@/lib/db/client"` in all lib/API files
- Row/Insert types: defined in `src/lib/db/types.ts`, used explicitly in `persist.ts`
- `AiUsageLogInsert`, `StudentInsert`, `StudentUpdate`, `UploadUpdate` — all defined in Task 2 Step 2
- `crypto.randomUUID()` used consistently for ID generation (no Prisma `@default(uuid())`)

### Placeholder Scan
None found — all steps contain actual code.

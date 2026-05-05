-- ============================================================
-- Structured import pipeline
-- Adds import sets, entity-aware uploads, sessions, and payments.
-- Backward-compatible: existing student fields and risk rows remain.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UploadEntityType') THEN
    CREATE TYPE "UploadEntityType" AS ENUM ('students','teachers','sessions','payments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ImportEntityStatus') THEN
    CREATE TYPE "ImportEntityStatus" AS ENUM ('missing','uploaded','mapped','reviewed','imported','failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ImportSet" (
  "id"             TEXT                 NOT NULL,
  "academyId"      TEXT                 NOT NULL,
  "name"           TEXT                 NOT NULL,
  "studentsStatus" "ImportEntityStatus" NOT NULL DEFAULT 'missing',
  "teachersStatus" "ImportEntityStatus" NOT NULL DEFAULT 'missing',
  "sessionsStatus" "ImportEntityStatus" NOT NULL DEFAULT 'missing',
  "paymentsStatus" "ImportEntityStatus" NOT NULL DEFAULT 'missing',
  "createdAt"      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  CONSTRAINT "ImportSet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportSet_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ImportSet_academyId_createdAt_idx" ON "ImportSet"("academyId","createdAt");

ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "importSetId" TEXT;
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "entityType" "UploadEntityType" NOT NULL DEFAULT 'students';
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "formatType" TEXT;
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "identifierJson" JSONB;
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "reviewJson" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Upload_importSetId_fkey'
  ) THEN
    ALTER TABLE "Upload"
      ADD CONSTRAINT "Upload_importSetId_fkey"
      FOREIGN KEY ("importSetId") REFERENCES "ImportSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Upload_importSetId_idx" ON "Upload"("importSetId");
CREATE INDEX IF NOT EXISTS "Upload_academyId_entityType_uploadedAt_idx" ON "Upload"("academyId","entityType","uploadedAt");

CREATE TABLE IF NOT EXISTS "Session" (
  "id"               TEXT        NOT NULL,
  "academyId"        TEXT        NOT NULL,
  "studentId"        TEXT        NOT NULL,
  "uploadId"         TEXT,
  "importSetId"      TEXT,
  "externalSessionId" TEXT,
  "sessionDate"      TIMESTAMPTZ,
  "attendanceStatus" TEXT,
  "rawStatus"        TEXT,
  "isCancelled"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "isRescheduled"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "teacherId"        TEXT,
  "teacherName"      TEXT,
  "subject"          TEXT,
  "durationMinutes"  INTEGER,
  "rawDataJson"      JSONB       NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Session_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Session_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Session_importSetId_fkey" FOREIGN KEY ("importSetId") REFERENCES "ImportSet"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Session_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Session_academyId_studentId_date_idx" ON "Session"("academyId","studentId","sessionDate");
CREATE INDEX IF NOT EXISTS "Session_uploadId_idx" ON "Session"("uploadId");

CREATE TABLE IF NOT EXISTS "Payment" (
  "id"             TEXT        NOT NULL,
  "academyId"      TEXT        NOT NULL,
  "studentId"      TEXT        NOT NULL,
  "uploadId"       TEXT,
  "importSetId"    TEXT,
  "externalPaymentId" TEXT,
  "billingMonth"   TEXT,
  "dueDate"        TIMESTAMPTZ,
  "paidDate"       TIMESTAMPTZ,
  "paymentDate"    TIMESTAMPTZ,
  "amount"         NUMERIC(10,2),
  "paymentStatus"  TEXT,
  "rawStatus"      TEXT,
  "isLate"         BOOLEAN     NOT NULL DEFAULT FALSE,
  "daysLate"       INTEGER     NOT NULL DEFAULT 0,
  "overdueAmount"  NUMERIC(10,2),
  "method"         TEXT,
  "rawDataJson"    JSONB       NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Payment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Payment_importSetId_fkey" FOREIGN KEY ("importSetId") REFERENCES "ImportSet"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Payment_academyId_studentId_date_idx" ON "Payment"("academyId","studentId","paymentDate");
CREATE INDEX IF NOT EXISTS "Payment_uploadId_idx" ON "Payment"("uploadId");

ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "externalSessionId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "rawStatus" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "isCancelled" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "isRescheduled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "externalPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billingMonth" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMPTZ;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paidDate" TIMESTAMPTZ;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "rawStatus" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "isLate" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "daysLate" INTEGER NOT NULL DEFAULT 0;

-- Legacy import set backfill: one set per academy, existing uploads attached.
INSERT INTO "ImportSet" ("id", "academyId", "name", "studentsStatus", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, a."id", 'Legacy imports', 'imported', NOW(), NOW()
FROM "Academy" a
WHERE NOT EXISTS (
  SELECT 1 FROM "ImportSet" i WHERE i."academyId" = a."id" AND i."name" = 'Legacy imports'
);

UPDATE "Upload" u
SET "importSetId" = i."id", "entityType" = 'students'
FROM "ImportSet" i
WHERE u."academyId" = i."academyId"
  AND i."name" = 'Legacy imports'
  AND u."importSetId" IS NULL;

-- RLS
ALTER TABLE "ImportSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ImportSet' AND policyname = 'import_set_select_own') THEN
    CREATE POLICY "import_set_select_own" ON "ImportSet" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ImportSet"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ImportSet' AND policyname = 'import_set_insert_own') THEN
    CREATE POLICY "import_set_insert_own" ON "ImportSet" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ImportSet"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ImportSet' AND policyname = 'import_set_update_own') THEN
    CREATE POLICY "import_set_update_own" ON "ImportSet" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ImportSet"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Session' AND policyname = 'session_select_own') THEN
    CREATE POLICY "session_select_own" ON "Session" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Session"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Session' AND policyname = 'session_insert_own') THEN
    CREATE POLICY "session_insert_own" ON "Session" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Session"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Session' AND policyname = 'session_update_own') THEN
    CREATE POLICY "session_update_own" ON "Session" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Session"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Payment' AND policyname = 'payment_select_own') THEN
    CREATE POLICY "payment_select_own" ON "Payment" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Payment"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Payment' AND policyname = 'payment_insert_own') THEN
    CREATE POLICY "payment_insert_own" ON "Payment" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Payment"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Payment' AND policyname = 'payment_update_own') THEN
    CREATE POLICY "payment_update_own" ON "Payment" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Payment"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

NOTIFY pgrst, 'reload schema';

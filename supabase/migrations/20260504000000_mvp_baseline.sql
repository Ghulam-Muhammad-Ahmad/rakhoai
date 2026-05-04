-- ============================================================
-- RakhoAI MVP Baseline Schema
-- Consolidated from migrations 20260504000001 through 20260504000005
-- Production-safe: uses IF NOT EXISTS throughout, no DROP statements
-- ============================================================

-- auth.uid() shim for local dev (no-op when Supabase auth schema already present)
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

-- ============================================================
-- Schema permissions
-- ============================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- ============================================================
-- Enums
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UploadStatus') THEN
    CREATE TYPE "UploadStatus" AS ENUM ('PENDING','PREVIEW_READY','MAPPED','PROCESSING','PROCESSED','FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskBand') THEN
    CREATE TYPE "RiskBand" AS ENUM ('HIGH','MEDIUM','LOW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionStatus') THEN
    CREATE TYPE "ActionStatus" AS ENUM ('PENDING','IN_PROGRESS','DONE','STUDENT_SAVED','STUDENT_LOST');
  END IF;
END $$;

-- ============================================================
-- Tables
-- ============================================================

-- Academy (ownerId references auth.users directly — no public User table)
CREATE TABLE IF NOT EXISTS "Academy" (
  "id"        TEXT        NOT NULL,
  "ownerId"   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name"      TEXT        NOT NULL,
  "country"   TEXT        NOT NULL,
  "currency"  TEXT        NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Academy_ownerId_key" ON "Academy"("ownerId");

-- Upload
CREATE TABLE IF NOT EXISTS "Upload" (
  "id"          TEXT           NOT NULL,
  "academyId"   TEXT           NOT NULL,
  "fileName"    TEXT           NOT NULL,
  "fileUrl"     TEXT,
  "status"      "UploadStatus" NOT NULL DEFAULT 'PENDING',
  "rowCount"    INTEGER,
  "headers"     JSONB,
  "sampleRows"  JSONB,
  "rawRowsJson" JSONB,
  "mappingJson" JSONB,
  "uploadedAt"  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ,
  CONSTRAINT "Upload_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Upload_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ColumnMapping
CREATE TABLE IF NOT EXISTS "ColumnMapping" (
  "id"          TEXT        NOT NULL,
  "academyId"   TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "mappingJson" JSONB       NOT NULL,
  "isDefault"   BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ColumnMapping_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "ColumnMapping_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Tutor (included in baseline to avoid sequential migration dependency)
CREATE TABLE IF NOT EXISTS "Tutor" (
  "id"        TEXT        NOT NULL,
  "academyId" TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Tutor_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Tutor_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tutor_academyId_name_key" ON "Tutor"("academyId", lower("name"));
CREATE INDEX IF NOT EXISTS "Tutor_academyId_idx" ON "Tutor"("academyId");

-- Student
CREATE TABLE IF NOT EXISTS "Student" (
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
  CONSTRAINT "Student_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Student_uploadId_fkey"  FOREIGN KEY ("uploadId")  REFERENCES "Upload"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Student_academyId_idx"            ON "Student"("academyId");
CREATE INDEX IF NOT EXISTS "Student_academyId_contact_idx"    ON "Student"("academyId","contact");
CREATE INDEX IF NOT EXISTS "Student_academyId_externalId_idx" ON "Student"("academyId","externalId");
CREATE INDEX IF NOT EXISTS "Student_academyId_name_idx"       ON "Student"("academyId","name");

-- tutorId FK on Student (added here rather than as a separate migration)
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "tutorId" TEXT REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RiskAssessment
CREATE TABLE IF NOT EXISTS "RiskAssessment" (
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
  CONSTRAINT "RiskAssessment_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "RiskAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RiskAssessment_uploadId_fkey"  FOREIGN KEY ("uploadId")  REFERENCES "Upload"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RiskAssessment_studentId_computedAt_idx" ON "RiskAssessment"("studentId","computedAt");
CREATE INDEX IF NOT EXISTS "RiskAssessment_uploadId_idx"              ON "RiskAssessment"("uploadId");
CREATE INDEX IF NOT EXISTS "RiskAssessment_riskBand_idx"              ON "RiskAssessment"("riskBand");

-- Action
CREATE TABLE IF NOT EXISTS "Action" (
  "id"        TEXT           NOT NULL,
  "academyId" TEXT           NOT NULL,
  "studentId" TEXT           NOT NULL,
  "type"      TEXT           NOT NULL,
  "content"   TEXT,
  "status"    "ActionStatus" NOT NULL DEFAULT 'PENDING',
  "takenBy"   TEXT,
  "takenAt"   TIMESTAMPTZ,
  "notes"     TEXT,
  "createdAt" TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT "Action_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Action_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Action_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id")  ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Action_academyId_status_idx" ON "Action"("academyId","status");
CREATE INDEX IF NOT EXISTS "Action_studentId_idx"        ON "Action"("studentId");

-- AiUsageLog
CREATE TABLE IF NOT EXISTS "AiUsageLog" (
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
  CONSTRAINT "AiUsageLog_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "AiUsageLog_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiUsageLog_uploadId_fkey"  FOREIGN KEY ("uploadId")  REFERENCES "Upload"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AiUsageLog_academyId_createdAt_idx" ON "AiUsageLog"("academyId","createdAt");
CREATE INDEX IF NOT EXISTS "AiUsageLog_uploadId_idx"             ON "AiUsageLog"("uploadId");
CREATE INDEX IF NOT EXISTS "AiUsageLog_feature_createdAt_idx"    ON "AiUsageLog"("feature","createdAt");

-- EmailAlert
CREATE TABLE IF NOT EXISTS "EmailAlert" (
  "id"               TEXT        NOT NULL,
  "academyId"        TEXT        NOT NULL,
  "studentId"        TEXT        NOT NULL,
  "riskAssessmentId" TEXT        NOT NULL,
  "recipientEmail"   TEXT        NOT NULL,
  "subject"          TEXT        NOT NULL,
  "body"             TEXT        NOT NULL,
  "status"           TEXT        NOT NULL DEFAULT 'QUEUED',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "sentAt"           TIMESTAMPTZ,
  "errorMessage"     TEXT,
  CONSTRAINT "EmailAlert_pkey"                 PRIMARY KEY ("id"),
  CONSTRAINT "EmailAlert_status_check"         CHECK ("status" IN ('QUEUED','SENT','FAILED')),
  CONSTRAINT "EmailAlert_riskAssessmentId_key" UNIQUE ("riskAssessmentId"),
  CONSTRAINT "EmailAlert_academyId_fkey"        FOREIGN KEY ("academyId")        REFERENCES "Academy"("id")        ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EmailAlert_studentId_fkey"        FOREIGN KEY ("studentId")        REFERENCES "Student"("id")        ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EmailAlert_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "EmailAlert_academyId_createdAt_idx" ON "EmailAlert"("academyId","createdAt");
CREATE INDEX IF NOT EXISTS "EmailAlert_studentId_idx"           ON "EmailAlert"("studentId");

-- ============================================================
-- Row-Level Security
-- ============================================================

-- Academy
ALTER TABLE "Academy" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Academy' AND policyname = 'academy_select_own') THEN
    CREATE POLICY "academy_select_own" ON "Academy" FOR SELECT USING ("ownerId" = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Academy' AND policyname = 'academy_insert_own') THEN
    CREATE POLICY "academy_insert_own" ON "Academy" FOR INSERT WITH CHECK ("ownerId" = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Academy' AND policyname = 'academy_update_own') THEN
    CREATE POLICY "academy_update_own" ON "Academy" FOR UPDATE USING ("ownerId" = auth.uid());
  END IF;
END $$;

-- Upload
ALTER TABLE "Upload" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Upload' AND policyname = 'upload_select_own') THEN
    CREATE POLICY "upload_select_own" ON "Upload" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Upload"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Upload' AND policyname = 'upload_insert_own') THEN
    CREATE POLICY "upload_insert_own" ON "Upload" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Upload"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Upload' AND policyname = 'upload_update_own') THEN
    CREATE POLICY "upload_update_own" ON "Upload" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Upload"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

-- ColumnMapping
ALTER TABLE "ColumnMapping" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ColumnMapping' AND policyname = 'column_mapping_select_own') THEN
    CREATE POLICY "column_mapping_select_own" ON "ColumnMapping" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ColumnMapping"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ColumnMapping' AND policyname = 'column_mapping_insert_own') THEN
    CREATE POLICY "column_mapping_insert_own" ON "ColumnMapping" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ColumnMapping"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ColumnMapping' AND policyname = 'column_mapping_update_own') THEN
    CREATE POLICY "column_mapping_update_own" ON "ColumnMapping" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ColumnMapping"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

-- Tutor
ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Tutor' AND policyname = 'tutor_select_own') THEN
    CREATE POLICY "tutor_select_own" ON "Tutor" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Tutor"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Tutor' AND policyname = 'tutor_insert_own') THEN
    CREATE POLICY "tutor_insert_own" ON "Tutor" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Tutor"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Tutor' AND policyname = 'tutor_update_own') THEN
    CREATE POLICY "tutor_update_own" ON "Tutor" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Tutor"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

-- Student
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Student' AND policyname = 'student_select_own') THEN
    CREATE POLICY "student_select_own" ON "Student" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Student"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Student' AND policyname = 'student_insert_own') THEN
    CREATE POLICY "student_insert_own" ON "Student" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Student"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Student' AND policyname = 'student_update_own') THEN
    CREATE POLICY "student_update_own" ON "Student" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Student"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

-- RiskAssessment
ALTER TABLE "RiskAssessment" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'RiskAssessment' AND policyname = 'risk_select_own') THEN
    CREATE POLICY "risk_select_own" ON "RiskAssessment" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Academy" a ON a.id = s."academyId"
      WHERE s.id = "RiskAssessment"."studentId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'RiskAssessment' AND policyname = 'risk_insert_own') THEN
    CREATE POLICY "risk_insert_own" ON "RiskAssessment" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Academy" a ON a.id = s."academyId"
      WHERE s.id = "RiskAssessment"."studentId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'RiskAssessment' AND policyname = 'risk_update_own') THEN
    CREATE POLICY "risk_update_own" ON "RiskAssessment" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Academy" a ON a.id = s."academyId"
      WHERE s.id = "RiskAssessment"."studentId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

-- Action
ALTER TABLE "Action" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Action' AND policyname = 'action_select_own') THEN
    CREATE POLICY "action_select_own" ON "Action" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Action"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Action' AND policyname = 'action_insert_own') THEN
    CREATE POLICY "action_insert_own" ON "Action" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Action"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Action' AND policyname = 'action_update_own') THEN
    CREATE POLICY "action_update_own" ON "Action" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Action"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

-- AiUsageLog
ALTER TABLE "AiUsageLog" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiUsageLog' AND policyname = 'ai_log_insert_service') THEN
    CREATE POLICY "ai_log_insert_service" ON "AiUsageLog" FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiUsageLog' AND policyname = 'ai_log_select_own') THEN
    CREATE POLICY "ai_log_select_own" ON "AiUsageLog" FOR SELECT USING (
      "academyId" IS NULL OR EXISTS (
        SELECT 1 FROM "Academy" a WHERE a.id = "AiUsageLog"."academyId" AND a."ownerId" = auth.uid()
      )
    );
  END IF;
END $$;

-- EmailAlert
ALTER TABLE "EmailAlert" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'EmailAlert' AND policyname = 'email_alert_select_own') THEN
    CREATE POLICY "email_alert_select_own" ON "EmailAlert" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "EmailAlert"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'EmailAlert' AND policyname = 'email_alert_insert_own') THEN
    CREATE POLICY "email_alert_insert_own" ON "EmailAlert" FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "EmailAlert"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'EmailAlert' AND policyname = 'email_alert_update_own') THEN
    CREATE POLICY "email_alert_update_own" ON "EmailAlert" FOR UPDATE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "EmailAlert"."academyId" AND a."ownerId" = auth.uid()
    ));
  END IF;
END $$;

-- ============================================================
-- Role grants
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

NOTIFY pgrst, 'reload schema';

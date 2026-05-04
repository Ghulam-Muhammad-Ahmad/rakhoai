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
  CONSTRAINT "RiskAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RiskAssessment_uploadId_fkey"  FOREIGN KEY ("uploadId")  REFERENCES "Upload"("id")  ON DELETE SET NULL ON UPDATE CASCADE
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
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Upload"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "upload_insert_own" ON "Upload"
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Upload"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "upload_update_own" ON "Upload"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Upload"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));

-- ColumnMapping
ALTER TABLE "ColumnMapping" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "column_mapping_select_own" ON "ColumnMapping"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "ColumnMapping"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "column_mapping_insert_own" ON "ColumnMapping"
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "ColumnMapping"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "column_mapping_update_own" ON "ColumnMapping"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "ColumnMapping"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));

-- Student
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_select_own" ON "Student"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Student"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "student_insert_own" ON "Student"
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Student"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "student_update_own" ON "Student"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Student"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));

-- RiskAssessment (scoped via Student → Academy)
ALTER TABLE "RiskAssessment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_select_own" ON "RiskAssessment"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "Student" s
    JOIN "Academy" a ON a.id = s."academyId"
    JOIN "User" u ON u.id = a."ownerId"
    WHERE s.id = "RiskAssessment"."studentId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "risk_insert_own" ON "RiskAssessment"
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM "Student" s
    JOIN "Academy" a ON a.id = s."academyId"
    JOIN "User" u ON u.id = a."ownerId"
    WHERE s.id = "RiskAssessment"."studentId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "risk_update_own" ON "RiskAssessment"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM "Student" s
    JOIN "Academy" a ON a.id = s."academyId"
    JOIN "User" u ON u.id = a."ownerId"
    WHERE s.id = "RiskAssessment"."studentId"
      AND u."supabaseId" = auth.uid()::text
  ));

-- Action
ALTER TABLE "Action" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "action_select_own" ON "Action"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Action"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "action_insert_own" ON "Action"
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Action"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));
CREATE POLICY "action_update_own" ON "Action"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM "Academy" a
    JOIN "User" u ON u.id = a."ownerId"
    WHERE a.id = "Action"."academyId"
      AND u."supabaseId" = auth.uid()::text
  ));

-- AiUsageLog
ALTER TABLE "AiUsageLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_log_insert_service" ON "AiUsageLog"
  FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_log_select_own" ON "AiUsageLog"
  FOR SELECT USING (
    "academyId" IS NULL OR EXISTS (
      SELECT 1 FROM "Academy" a
      JOIN "User" u ON u.id = a."ownerId"
      WHERE a.id = "AiUsageLog"."academyId"
        AND u."supabaseId" = auth.uid()::text
    )
  );

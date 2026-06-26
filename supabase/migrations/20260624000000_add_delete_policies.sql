-- ============================================================
-- Add DELETE RLS policies (owner-scoped)
-- Baseline migrations created SELECT/INSERT/UPDATE policies but no
-- DELETE policies. Once data paths move off the service-role key to
-- the user-scoped client, deletes (bulk-delete, etc.) would be blocked
-- by RLS. These policies mirror the existing owner-scoping chain.
-- Additive and idempotent.
-- ============================================================

DO $$ BEGIN
  -- Academy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Academy' AND policyname = 'academy_delete_own') THEN
    CREATE POLICY "academy_delete_own" ON "Academy" FOR DELETE USING ("ownerId" = auth.uid());
  END IF;

  -- Upload
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Upload' AND policyname = 'upload_delete_own') THEN
    CREATE POLICY "upload_delete_own" ON "Upload" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Upload"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- ColumnMapping
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ColumnMapping' AND policyname = 'column_mapping_delete_own') THEN
    CREATE POLICY "column_mapping_delete_own" ON "ColumnMapping" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ColumnMapping"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- Tutor
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Tutor' AND policyname = 'tutor_delete_own') THEN
    CREATE POLICY "tutor_delete_own" ON "Tutor" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Tutor"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- Student
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Student' AND policyname = 'student_delete_own') THEN
    CREATE POLICY "student_delete_own" ON "Student" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Student"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- RiskAssessment (scoped via Student -> Academy)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'RiskAssessment' AND policyname = 'risk_delete_own') THEN
    CREATE POLICY "risk_delete_own" ON "RiskAssessment" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Student" s JOIN "Academy" a ON a.id = s."academyId"
      WHERE s.id = "RiskAssessment"."studentId" AND a."ownerId" = auth.uid()));
  END IF;

  -- Action
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Action' AND policyname = 'action_delete_own') THEN
    CREATE POLICY "action_delete_own" ON "Action" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Action"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- EmailAlert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'EmailAlert' AND policyname = 'email_alert_delete_own') THEN
    CREATE POLICY "email_alert_delete_own" ON "EmailAlert" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "EmailAlert"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- ImportSet
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ImportSet' AND policyname = 'import_set_delete_own') THEN
    CREATE POLICY "import_set_delete_own" ON "ImportSet" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "ImportSet"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- Session
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Session' AND policyname = 'session_delete_own') THEN
    CREATE POLICY "session_delete_own" ON "Session" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Session"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- Payment
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Payment' AND policyname = 'payment_delete_own') THEN
    CREATE POLICY "payment_delete_own" ON "Payment" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Payment"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  -- AiUsageLog (owner-scoped; rows with NULL academyId are not user-deletable)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AiUsageLog' AND policyname = 'ai_log_delete_own') THEN
    CREATE POLICY "ai_log_delete_own" ON "AiUsageLog" FOR DELETE USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "AiUsageLog"."academyId" AND a."ownerId" = auth.uid()));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

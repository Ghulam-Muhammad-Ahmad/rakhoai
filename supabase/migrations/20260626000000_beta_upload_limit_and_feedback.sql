-- ============================================================
-- Beta: per-academy upload cap + Feedback table
--
-- 1. Academy.uploadLimit (INT, NULL = unlimited). Prod-safe: existing
--    rows stay NULL so nothing is capped until a value is set. In the
--    beta env, cap testers with e.g.:
--        ALTER TABLE "Academy" ALTER COLUMN "uploadLimit" SET DEFAULT 5;
--        UPDATE "Academy" SET "uploadLimit" = 5;
--
-- 2. Restrictive RLS policy on Upload enforcing that cap at insert time.
--    RESTRICTIVE = AND-ed with the existing permissive owner policies,
--    so it tightens rather than replaces them. Works because uploads
--    are inserted via the user-scoped client (RLS applies).
--
-- 3. Feedback table — feature requests / bug reports / general feedback,
--    owner-scoped via the academy chain.
-- Additive and idempotent.
-- ============================================================

ALTER TABLE "Academy" ADD COLUMN IF NOT EXISTS "uploadLimit" INTEGER;

DO $$ BEGIN
  -- Cap the number of Upload rows per academy when uploadLimit is set.
  -- NULL limit -> coalesced to int max -> always passes (unlimited).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Upload' AND policyname = 'upload_insert_limit') THEN
    CREATE POLICY "upload_insert_limit" ON "Upload" AS RESTRICTIVE FOR INSERT
    WITH CHECK (
      COALESCE(
        (SELECT a."uploadLimit" FROM "Academy" a WHERE a.id = "Upload"."academyId"),
        2147483647
      ) > (SELECT count(*) FROM "Upload" u WHERE u."academyId" = "Upload"."academyId")
    );
  END IF;
END $$;

-- ------------------------------------------------------------
-- Feedback
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Feedback" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "academyId" TEXT        NOT NULL,
  "userId"    UUID        NOT NULL DEFAULT auth.uid(),
  "type"      TEXT        NOT NULL DEFAULT 'feedback',
  "title"     TEXT        NOT NULL,
  "body"      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Feedback_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Feedback_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE,
  CONSTRAINT "Feedback_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "Feedback_type_check"     CHECK ("type" IN ('feedback','feature','bug'))
);
CREATE INDEX IF NOT EXISTS "Feedback_academyId_idx" ON "Feedback"("academyId");

ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Feedback' AND policyname = 'feedback_select_own') THEN
    CREATE POLICY "feedback_select_own" ON "Feedback" FOR SELECT USING (EXISTS (
      SELECT 1 FROM "Academy" a WHERE a.id = "Feedback"."academyId" AND a."ownerId" = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Feedback' AND policyname = 'feedback_insert_own') THEN
    CREATE POLICY "feedback_insert_own" ON "Feedback" FOR INSERT WITH CHECK (
      "userId" = auth.uid()
      AND EXISTS (SELECT 1 FROM "Academy" a WHERE a.id = "Feedback"."academyId" AND a."ownerId" = auth.uid()));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

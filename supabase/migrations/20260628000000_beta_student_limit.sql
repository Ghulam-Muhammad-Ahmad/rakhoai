-- ============================================================
-- Beta: per-academy student cap (mirrors Academy.uploadLimit).
--
-- Academy.studentLimit (INT, NULL = unlimited). Prod-safe: existing
-- rows stay NULL so nothing is capped until a value is set. In beta,
-- cap testers with e.g.:
--     ALTER TABLE "Academy" ALTER COLUMN "studentLimit" SET DEFAULT 50;
--     UPDATE "Academy" SET "studentLimit" = 50;
--
-- NOTE: No RLS policy on Student. New students are inserted by the
-- background importer on the SERVICE-ROLE client, which bypasses RLS,
-- so the cap is enforced in app code (lib/imports/process-upload.ts).
-- A RESTRICTIVE Student policy would only fire for user-scoped inserts,
-- of which there are none in the import path — it would be dead.
-- Additive and idempotent.
-- ============================================================

ALTER TABLE "Academy" ADD COLUMN IF NOT EXISTS "studentLimit" INTEGER;

NOTIFY pgrst, 'reload schema';

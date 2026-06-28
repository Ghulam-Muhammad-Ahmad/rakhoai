-- ============================================================
-- Drop the recursive Upload insert-cap policy.
--
-- The RESTRICTIVE policy "upload_insert_limit" counted Upload rows from
-- inside Upload's own RLS, which re-triggers the Upload SELECT policy and
-- Postgres aborts with "infinite recursion detected in policy". This broke
-- every Upload insert.
--
-- The per-entity-type cap (one students/teachers/sessions/payments upload
-- per academy) is now enforced in app code (src/app/api/uploads/route.ts),
-- so the broken total-count RLS policy is redundant. Drop it.
-- Academy.uploadLimit column is kept (harmless, NULL = unlimited).
-- Idempotent.
-- ============================================================

DROP POLICY IF EXISTS "upload_insert_limit" ON "Upload";

NOTIFY pgrst, 'reload schema';

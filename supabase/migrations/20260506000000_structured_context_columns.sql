-- Add structured session/payment context columns in a new migration.
-- The original structured import migration may already be recorded as applied,
-- so edits to that file are not replayed by `supabase db push`.

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

NOTIFY pgrst, 'reload schema';

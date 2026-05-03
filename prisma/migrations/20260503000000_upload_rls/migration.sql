DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'UploadStatus'
  ) THEN
    CREATE TYPE "UploadStatus" AS ENUM (
      'PENDING',
      'PREVIEW_READY',
      'MAPPED',
      'PROCESSING',
      'PROCESSED',
      'FAILED'
    );
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Upload" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER,
    "headers" JSONB,
    "sampleRows" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Upload_academyId_fkey'
  ) THEN
    ALTER TABLE "Upload"
    ADD CONSTRAINT "Upload_academyId_fkey"
    FOREIGN KEY ("academyId") REFERENCES "Academy"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Enable RLS on Upload table
ALTER TABLE "Upload" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upload_select_own" ON "Upload"
  FOR SELECT USING (
    "academyId" IN (
      SELECT id FROM "Academy" WHERE "ownerId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  );

CREATE POLICY "upload_insert_own" ON "Upload"
  FOR INSERT WITH CHECK (
    "academyId" IN (
      SELECT id FROM "Academy" WHERE "ownerId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  );

CREATE POLICY "upload_update_own" ON "Upload"
  FOR UPDATE USING (
    "academyId" IN (
      SELECT id FROM "Academy" WHERE "ownerId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  );

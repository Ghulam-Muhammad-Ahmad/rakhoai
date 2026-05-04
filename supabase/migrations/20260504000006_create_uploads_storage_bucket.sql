INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  4194304,
  ARRAY[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'uploads_owner_read'
  ) THEN
    CREATE POLICY "uploads_owner_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'uploads'
      AND EXISTS (
        SELECT 1
        FROM public."Academy" a
        WHERE a.id = split_part(name, '/', 1)
          AND a."ownerId" = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'uploads_service_insert'
  ) THEN
    CREATE POLICY "uploads_service_insert" ON storage.objects
    FOR INSERT TO service_role
    WITH CHECK (bucket_id = 'uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'uploads_service_update'
  ) THEN
    CREATE POLICY "uploads_service_update" ON storage.objects
    FOR UPDATE TO service_role
    USING (bucket_id = 'uploads');
  END IF;
END $$;

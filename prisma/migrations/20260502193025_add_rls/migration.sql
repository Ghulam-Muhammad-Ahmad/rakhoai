-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- User can only read/write their own row
CREATE POLICY "users_select_own" ON "User"
  FOR SELECT USING (auth.uid()::text = "supabaseId");

CREATE POLICY "users_insert_own" ON "User"
  FOR INSERT WITH CHECK (auth.uid()::text = "supabaseId");

CREATE POLICY "users_update_own" ON "User"
  FOR UPDATE USING (auth.uid()::text = "supabaseId");


-- Enable RLS on Academy table
ALTER TABLE "Academy" ENABLE ROW LEVEL SECURITY;

-- Academy owner can read/write their own academy
CREATE POLICY "academy_select_own" ON "Academy"
  FOR SELECT USING (
    "ownerId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  );

CREATE POLICY "academy_insert_own" ON "Academy"
  FOR INSERT WITH CHECK (
    "ownerId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  );

CREATE POLICY "academy_update_own" ON "Academy"
  FOR UPDATE USING (
    "ownerId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  );

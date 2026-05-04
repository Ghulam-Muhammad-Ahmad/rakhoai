import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const globalForDb = globalThis as unknown as { db: SupabaseClient<Database> };

export const db: SupabaseClient<Database> =
  globalForDb.db ?? createAdminClient();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

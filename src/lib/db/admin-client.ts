import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, key);
}

const globalForDb = globalThis as unknown as { adminDb: SupabaseClient<Database> };

/** Admin client — bypasses ALL RLS. Use ONLY for:
 *  - Supabase Storage admin operations
 *  - Auth admin (getUserById, etc.)
 *  - Background jobs with no user context
 *  NEVER use for regular data queries.
 */
export const adminDb: SupabaseClient<Database> =
  globalForDb.adminDb ?? createAdminClient();

if (process.env.NODE_ENV !== "production") globalForDb.adminDb = adminDb;

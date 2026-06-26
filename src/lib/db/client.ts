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

/** 
 * ADMIN CLIENT — BYPASSES ALL ROW LEVEL SECURITY.
 * 
 * Use ONLY for:
 *   - Supabase Storage admin operations
 *   - Auth admin APIs (e.g. getUserById)
 *   - Background jobs with no authenticated user context
 * 
 * DO NOT use for regular data queries. Once RLS policies are
 * enabled on your Supabase tables, migrate to `getUserDb()`
 * from `@/lib/db/user-client` so queries are scoped to the
 * logged-in user and enforced by the database.
 * 
 * TODO: After enabling RLS policies on all tables, replace
 * all `db` imports from `@/lib/db/client` with user-scoped
 * clients from `@/lib/db/user-client`.
 */
export const adminDb: SupabaseClient<Database> =
  globalForDb.adminDb ?? createAdminClient();

if (process.env.NODE_ENV !== "production") globalForDb.adminDb = adminDb;

/** @deprecated Use `adminDb` for clarity, or migrate to `getUserDb()` once RLS is enabled. */
export const db = adminDb;

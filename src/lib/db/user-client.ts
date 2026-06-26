import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Get a user-scoped Supabase client that respects RLS policies.
 *  Use this for ALL data operations inside API routes and Server Components.
 */
export async function getUserDb(): Promise<SupabaseClient<Database>> {
  return createClient();
}

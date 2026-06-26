import { db } from "./client";
import type { AcademyRow } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type AuthUserWithAcademy = {
  id: string;
  academy: AcademyRow | null;
};

export async function getAcademyForAuthUser(
  authUserId: string,
  client?: SupabaseClient<Database>
): Promise<AcademyRow | null> {
  const dbClient = client ?? db;
  const { data, error } = await dbClient
    .from("Academy")
    .select("*")
    .eq("ownerId", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load academy`);
  }

  return data;
}

export async function getAuthUserWithAcademy(
  authUserId: string,
  client?: SupabaseClient<Database>
): Promise<AuthUserWithAcademy> {
  return {
    id: authUserId,
    academy: await getAcademyForAuthUser(authUserId, client),
  };
}

export async function getAcademyIdForSupabaseUser(
  authUserId: string,
  client?: SupabaseClient<Database>
): Promise<string | null> {
  const academy = await getAcademyForAuthUser(authUserId, client);
  return academy?.id ?? null;
}

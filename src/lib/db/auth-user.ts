import { db } from "./client";
import type { AcademyRow } from "./types";

export type AuthUserWithAcademy = {
  id: string;
  academy: AcademyRow | null;
};

export async function getAcademyForAuthUser(authUserId: string): Promise<AcademyRow | null> {
  const { data, error } = await db
    .from("Academy")
    .select("*")
    .eq("ownerId", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load academy: ${error.message}`);
  }

  return data;
}

export async function getAuthUserWithAcademy(authUserId: string): Promise<AuthUserWithAcademy> {
  return {
    id: authUserId,
    academy: await getAcademyForAuthUser(authUserId),
  };
}

export async function getAcademyIdForSupabaseUser(authUserId: string): Promise<string | null> {
  const academy = await getAcademyForAuthUser(authUserId);
  return academy?.id ?? null;
}

import crypto from "node:crypto";
import { adminDb } from "@/lib/db/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { getStudentRiskList } from "@/lib/students/risk";
import { buildTutorStats } from "./tutor-core";

export async function getOrCreateTutor(
  academyId: string,
  name: string | null | undefined,
  client?: SupabaseClient<Database>
) {
  const db = client ?? adminDb;
  const cleanName = name?.trim();
  if (!cleanName) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (db as any)
    .from("Tutor")
    .select("id")
    .eq("academyId", academyId)
    .ilike("name", cleanName)
    .maybeSingle() as { data: { id: string } | null; error: { message: string } | null };
  if (fetchError) throw new Error(`Failed to load tutor: ${fetchError.message}`);
  if (existing) return existing;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("Tutor")
    .insert({
      id: crypto.randomUUID(),
      academyId,
      name: cleanName,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };
  if (error) throw new Error(`Failed to create tutor`);
  return data;
}

export async function getTutorStats(
  academyId: string,
  client?: SupabaseClient<Database>
) {
  const students = await getStudentRiskList(academyId, {
    sort: "riskScore",
    direction: "desc",
  }, "$", client);

  return buildTutorStats(
    students.map((student) => ({
      tutorName: student.tutor ?? null,
      riskBand: student.riskBand,
      riskScore: student.riskScore,
      attendanceRate: student.attendanceRate,
      feesAmount: student.feesAmount ?? null,
      actionStatus: student.latestActionStatus,
    }))
  );
}

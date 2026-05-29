import { db } from "@/lib/db/client";
import { buildDeleteResult, type DeleteResult } from "./bulk-delete-core";

type IdRow = { id: string };
type TutorRow = { id: string; name: string };

function nowIso(): string {
  return new Date().toISOString();
}

async function getOwnedIds(table: string, academyId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from(table)
    .select("id")
    .eq("academyId", academyId)
    .in("id", ids) as { data: IdRow[] | null; error: { message: string } | null };

  if (error) throw new Error(`Failed to verify ${table} ownership: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

async function deleteRowsByIds(table: string, academyId: string, ids: string[]) {
  if (ids.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from(table)
    .delete()
    .eq("academyId", academyId)
    .in("id", ids) as { error: { message: string } | null };

  if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
}

async function deleteRowsByStudentIds(table: string, academyId: string, studentIds: string[]) {
  if (studentIds.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from(table)
    .delete()
    .eq("academyId", academyId)
    .in("studentId", studentIds) as { error: { message: string } | null };

  if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
}

export async function deleteStudentsForAcademy(academyId: string, ids: string[]): Promise<DeleteResult> {
  const ownedIds = await getOwnedIds("Student", academyId, ids);
  if (ownedIds.length === 0) return buildDeleteResult("students", ids, []);

  await deleteRowsByStudentIds("EmailAlert", academyId, ownedIds);
  await deleteRowsByStudentIds("Action", academyId, ownedIds);
  await deleteRowsByStudentIds("Payment", academyId, ownedIds);
  await deleteRowsByStudentIds("Session", academyId, ownedIds);

  const riskResult = await db
    .from("RiskAssessment")
    .delete()
    .in("studentId", ownedIds) as { error: { message: string } | null };
  if (riskResult.error) throw new Error(`Failed to delete RiskAssessment: ${riskResult.error.message}`);

  await deleteRowsByIds("Student", academyId, ownedIds);
  return buildDeleteResult("students", ids, ownedIds);
}

export async function deleteActionsForAcademy(academyId: string, ids: string[]): Promise<DeleteResult> {
  const ownedIds = await getOwnedIds("Action", academyId, ids);
  await deleteRowsByIds("Action", academyId, ownedIds);
  return buildDeleteResult("interventions", ids, ownedIds);
}

export async function deletePaymentsForAcademy(academyId: string, ids: string[]): Promise<DeleteResult> {
  const ownedIds = await getOwnedIds("Payment", academyId, ids);
  await deleteRowsByIds("Payment", academyId, ownedIds);
  return buildDeleteResult("payments", ids, ownedIds);
}

export async function deleteSessionsForAcademy(academyId: string, ids: string[]): Promise<DeleteResult> {
  const ownedIds = await getOwnedIds("Session", academyId, ids);
  await deleteRowsByIds("Session", academyId, ownedIds);
  return buildDeleteResult("sessions", ids, ownedIds);
}

export async function unassignTutorsForAcademy(academyId: string, names: string[]): Promise<DeleteResult> {
  if (names.length === 0) return buildDeleteResult("tutors", [], []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tutors, error: tutorError } = await (db as any)
    .from("Tutor")
    .select("id, name")
    .eq("academyId", academyId)
    .in("name", names) as { data: TutorRow[] | null; error: { message: string } | null };

  if (tutorError) throw new Error(`Failed to load tutors: ${tutorError.message}`);

  const tutorIds = (tutors ?? []).map((tutor) => tutor.id);
  const matchedNames = new Set((tutors ?? []).map((tutor) => tutor.name.toLowerCase()));
  const now = nowIso();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentByName = await (db as any)
    .from("Student")
    .update({ tutor: null, tutorId: null, updatedAt: now })
    .eq("academyId", academyId)
    .in("tutor", names) as { error: { message: string } | null };
  if (studentByName.error) throw new Error(`Failed to unassign tutor students: ${studentByName.error.message}`);

  if (tutorIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentById = await (db as any)
      .from("Student")
      .update({ tutor: null, tutorId: null, updatedAt: now })
      .eq("academyId", academyId)
      .in("tutorId", tutorIds) as { error: { message: string } | null };
    if (studentById.error) throw new Error(`Failed to unassign tutor students: ${studentById.error.message}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionByTutor = await (db as any)
      .from("Session")
      .update({ teacherId: null, updatedAt: now })
      .eq("academyId", academyId)
      .in("teacherId", tutorIds) as { error: { message: string } | null };
    if (sessionByTutor.error) throw new Error(`Failed to unassign tutor sessions: ${sessionByTutor.error.message}`);

    await deleteRowsByIds("Tutor", academyId, tutorIds);
  }

  return buildDeleteResult(
    "tutors",
    names,
    names.filter((name) => matchedNames.has(name.toLowerCase()))
  );
}

import { db } from "@/lib/db/client";
import type { Json, Database } from "@/lib/db/database.types";
import { CanonicalStudentInput, AiRiskResult } from "./types";
import { computeRuleScore } from "./rules";
import { queueHighRiskAlert } from "@/lib/alerts/high-risk";
import { getOrCreateTutor } from "@/lib/tutors/tutors";
import crypto from "node:crypto";

type StudentRow = Database["public"]["Tables"]["Student"]["Row"];
type StudentInsert = Database["public"]["Tables"]["Student"]["Insert"];
type StudentUpdate = Database["public"]["Tables"]["Student"]["Update"];
type RiskAssessmentInsert = Database["public"]["Tables"]["RiskAssessment"]["Insert"];

function getStudentResultKey(student: CanonicalStudentInput): string {
  return student.contact ?? student.externalId ?? student.name;
}

export async function persistRiskResults(args: {
  academyId: string;
  uploadId: string;
  students: CanonicalStudentInput[];
  results: AiRiskResult[];
  model: string;
}) {
  const resultByKey = new Map(args.results.map((r) => [r.studentKey, r]));

  // Load all existing students for this academy in one query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingStudents, error: fetchError } = await (db as any)
    .from("Student")
    .select("id, contact, externalId, name, updatedAt")
    .eq("academyId", args.academyId) as { data: Pick<StudentRow, "id" | "contact" | "externalId" | "name" | "updatedAt">[] | null; error: { message: string } | null };

  if (fetchError) throw new Error(`Failed to load existing students: ${fetchError.message}`);

  // Build in-memory lookup maps (contact/externalId/name → student id)
  const byContact  = new Map<string, string>();
  const byExternal = new Map<string, string>();
  const byName     = new Map<string, string>();

  for (const s of existingStudents ?? []) {
    if (s.contact)    byContact.set(s.contact, s.id);
    if (s.externalId) byExternal.set(s.externalId, s.id);
    byName.set(s.name, s.id);
  }

  for (const student of args.students) {
    const key = getStudentResultKey(student);
    const result = resultByKey.get(key);
    if (!result) {
      console.warn(`[persistRiskResults] No AI result for student key "${key}" — skipping`);
      continue;
    }

    const now = new Date().toISOString();
    const tutor = await getOrCreateTutor(args.academyId, student.tutor);
    const studentData: StudentUpdate & { tutorId?: string | null } = {
      academyId: args.academyId,
      uploadId: args.uploadId,
      externalId: student.externalId ?? null,
      name: student.name,
      contact: student.contact ?? null,
      joinDate: student.joinDate?.toISOString() ?? null,
      lastSessionDate: student.lastSessionDate?.toISOString() ?? null,
      attendanceRate: student.attendanceRate ?? null,
      paymentStatus: student.paymentStatus ?? null,
      lastPaymentDate: student.lastPaymentDate?.toISOString() ?? null,
      totalSessions: student.totalSessions ?? null,
      feesAmount: student.feesAmount ?? null,
      subject: student.subject ?? null,
      tutor: student.tutor ?? null,
      tutorId: tutor?.id ?? null,
      rawDataJson: student.rawData as Json,
      updatedAt: now,
    };

    // Resolve existing student ID from in-memory maps
    const existingId =
      (student.contact    && byContact.get(student.contact))    ||
      (student.externalId && byExternal.get(student.externalId)) ||
      byName.get(student.name) ||
      null;

    let studentId: string;
    if (existingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error } = await (db as any)
        .from("Student")
        .update(studentData)
        .eq("id", existingId)
        .select("id")
        .single() as { data: Pick<StudentRow, "id"> | null; error: { message: string } | null };
      if (error) throw new Error(`Failed to update student: ${error.message}`);
      if (!updated) throw new Error(`Student ${existingId} was deleted before update`);
      studentId = updated.id;
    } else {
      const insertData: StudentInsert = { ...studentData, id: crypto.randomUUID(), createdAt: now, name: student.name, academyId: args.academyId, rawDataJson: student.rawData as Json };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any)
        .from("Student")
        .insert(insertData)
        .select("id")
        .single() as { data: Pick<StudentRow, "id"> | null; error: { message: string } | null };
      if (error) throw new Error(`Failed to insert student: ${error.message}`);
      if (!data) throw new Error("Failed to insert student: no row returned (RLS policy may block SELECT after INSERT)");
      studentId = data.id;
    }

    const raInsert: RiskAssessmentInsert = {
      id: crypto.randomUUID(),
      studentId,
      uploadId: args.uploadId,
      riskScore: result.riskScore,
      riskBand: result.riskBand as Database["public"]["Enums"]["RiskBand"],
      reasonsJson: result.reasons as Json,
      recommendedAction: result.recommendedAction,
      confidence: result.confidence,
      ruleScore: computeRuleScore(student).score,
      aiModel: args.model,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: riskAssessment, error: raError } = await (db as any)
      .from("RiskAssessment")
      .insert(raInsert)
      .select("*")
      .single() as { data: Database["public"]["Tables"]["RiskAssessment"]["Row"] | null; error: { message: string } | null };
    if (raError) throw new Error(`Failed to insert risk assessment: ${raError.message}`);
    if (riskAssessment) {
      try {
        await queueHighRiskAlert({
          academyId: args.academyId,
          student: { id: studentId, name: student.name },
          riskAssessment,
        });
      } catch (alertError) {
        console.warn(
          `[persistRiskResults] Failed to queue high-risk alert for student "${student.name}": ${
            alertError instanceof Error ? alertError.message : "unknown error"
          }`
        );
      }
    }
  }
}

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

// NOTE: This must mirror studentKey() in ai.ts (contact ?? externalId ?? name),
// because AiRiskResult.studentKey is produced there and looked up here. The
// sibling-collapse risk at THIS key lives in ai.ts (off-limits, and this whole
// file is currently a dead path via the unused processMappedUpload). We leave
// the key as-is and instead fix the DB student-ID resolution below, which is
// the part that silently merged siblings on a shared contact.
function getStudentResultKey(student: CanonicalStudentInput): string {
  return student.contact ?? student.externalId ?? student.name;
}

// See process-upload.ts: synthetic externalIds (`${name}-${rowIndex}`) are
// per-upload only and must not match existing students across uploads.
const SYNTHETIC_EXTERNAL_ID = /-\d+$/;
function isSyntheticExternalId(externalId: string | null | undefined, name: string): boolean {
  if (!externalId) return false;
  return externalId.toLowerCase() === `${name.toLowerCase()}-${externalId.replace(/^.*-/, "")}`
    && SYNTHETIC_EXTERNAL_ID.test(externalId);
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

  // Build in-memory lookup maps. Contact alone is NOT a safe key: tutoring
  // siblings share one parent phone, so byContact would collapse them. Use a
  // (contact + name) composite instead, real (non-synthetic) externalId, and an
  // unambiguous-name map (null when a name is shared by >1 existing student).
  const byContactName = new Map<string, string>();
  const byExternal    = new Map<string, string>();
  const byName        = new Map<string, string | null>();

  for (const s of existingStudents ?? []) {
    if (s.contact) byContactName.set(`${s.contact}|${s.name}`, s.id);
    if (s.externalId && !isSyntheticExternalId(s.externalId, s.name)) {
      byExternal.set(s.externalId, s.id);
    }
    byName.set(s.name, byName.has(s.name) ? null : s.id);
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

    // Resolve existing student ID. Precedence: real external id → (contact +
    // name) composite → unambiguous name. A bare shared phone with a DIFFERENT
    // name no longer merges siblings; a returning student (same phone AND name)
    // still matches.
    const realExternalId =
      student.externalId && !isSyntheticExternalId(student.externalId, student.name)
        ? student.externalId
        : null;
    const existingId =
      (realExternalId && byExternal.get(realExternalId)) ||
      (student.contact && byContactName.get(`${student.contact}|${student.name}`)) ||
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

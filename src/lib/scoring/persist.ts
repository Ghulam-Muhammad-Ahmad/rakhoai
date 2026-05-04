import { db } from "@/lib/db/client";
import { CanonicalStudentInput, AiRiskResult } from "./types";
import { computeRuleScore } from "./rules";
import crypto from "node:crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyDb = db as any;

function getStudentResultKey(student: CanonicalStudentInput): string {
  return student.contact ?? student.externalId ?? student.name;
}

async function findExistingStudentId(
  academyId: string,
  student: CanonicalStudentInput
): Promise<string | null> {
  if (student.contact) {
    const { data } = await anyDb
      .from("Student")
      .select("id")
      .eq("academyId", academyId)
      .eq("contact", student.contact)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return (data as { id: string }).id;
  }

  if (student.externalId) {
    const { data } = await anyDb
      .from("Student")
      .select("id")
      .eq("academyId", academyId)
      .eq("externalId", student.externalId)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return (data as { id: string }).id;
  }

  const { data } = await anyDb
    .from("Student")
    .select("id")
    .eq("academyId", academyId)
    .eq("name", student.name)
    .order("updatedAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function persistRiskResults(args: {
  academyId: string;
  uploadId: string;
  students: CanonicalStudentInput[];
  results: AiRiskResult[];
  model: string;
}) {
  const resultByKey = new Map(args.results.map((r) => [r.studentKey, r]));

  for (const student of args.students) {
    const key = getStudentResultKey(student);
    const result = resultByKey.get(key);
    if (!result) continue;

    const now = new Date().toISOString();
    const studentData = {
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
      feesAmount: student.feesAmount != null ? String(student.feesAmount) : null,
      subject: student.subject ?? null,
      tutor: student.tutor ?? null,
      rawDataJson: student.rawData,
      updatedAt: now,
    };

    const existingId = await findExistingStudentId(args.academyId, student);

    let studentId: string;
    if (existingId) {
      const { error } = await anyDb.from("Student").update(studentData).eq("id", existingId);
      if (error) throw new Error(`Failed to update student: ${error.message}`);
      studentId = existingId;
    } else {
      const insert = { ...studentData, id: crypto.randomUUID(), createdAt: now };
      const { data, error } = await anyDb.from("Student").insert(insert).select("id").single();
      if (error || !data) throw new Error(`Failed to insert student: ${error?.message}`);
      studentId = (data as { id: string }).id;
    }

    const { error: raError } = await anyDb.from("RiskAssessment").insert({
      id: crypto.randomUUID(),
      studentId,
      uploadId: args.uploadId,
      riskScore: result.riskScore,
      riskBand: result.riskBand,
      reasonsJson: result.reasons,
      recommendedAction: result.recommendedAction,
      confidence: result.confidence,
      ruleScore: computeRuleScore(student).score,
      aiModel: args.model,
    });
    if (raError) throw new Error(`Failed to insert risk assessment: ${raError.message}`);
  }
}

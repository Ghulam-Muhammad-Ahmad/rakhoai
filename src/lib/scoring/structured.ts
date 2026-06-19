import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import type { Json } from "@/lib/db/database.types";
import { computeRuleScore, getRiskBand } from "./rules";
import { buildStructuredStudentSignals, getStructuredRiskConfidence } from "./structured-core";
import type { StructuredPaymentRow, StructuredSessionRow, StructuredStudentRow } from "./structured-core";

function recommendationForScore(score: number): string {
  if (score >= 70) return "Call the guardian and agree on a recovery plan for this week.";
  if (score >= 40) return "Send a personal check-in and review attendance or payment blockers.";
  return "Monitor after the next session and payment update.";
}

function latestDateFromUploads(rows: Array<{ processedAt: string | null; uploadedAt: string | null }>): Date | null {
  return rows
    .map((row) => row.processedAt ?? row.uploadedAt)
    .filter((value): value is string => !!value)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

export async function runStructuredRiskScoring(academyId: string, uploadId: string | null = null) {
  const { data: students, error: studentsError } = await db
    .from("Student")
    .select("id, name, externalId, contact, subject, tutor, feesAmount, rawDataJson, attendanceRate, lastSessionDate, paymentStatus, lastPaymentDate, totalSessions")
    .eq("academyId", academyId) as { data: StructuredStudentRow[] | null; error: { message: string } | null };
  if (studentsError) throw new Error(`Failed to load students: ${studentsError.message}`);
  if (!students?.length) throw new Error("Import students before running risk scoring.");

  // Stored summary fields already on the Student row (e.g. from an aggregate
  // sessions/payments upload). Used as a fallback when there are no per-event
  // Session/Payment rows to recompute from — otherwise aggregate data is ignored.
  // The DB select returns extra summary fields not declared on StructuredStudentRow.
  type StoredStudent = StructuredStudentRow & {
    attendanceRate?: number | null;
    lastSessionDate?: string | null;
    paymentStatus?: string | null;
    lastPaymentDate?: string | null;
    totalSessions?: number | null;
  };
  const storedById = new Map<string, StoredStudent>((students as StoredStudent[]).map((s) => [s.id, s]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions, error: sessionsError } = await (db as any)
    .from("Session")
    .select("studentId, sessionDate, attendanceStatus")
    .eq("academyId", academyId) as { data: StructuredSessionRow[] | null; error: { message: string } | null };
  if (sessionsError) throw new Error(`Failed to load sessions: ${sessionsError.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payments, error: paymentsError } = await (db as any)
    .from("Payment")
    .select("studentId, paymentDate, paymentStatus, amount, overdueAmount")
    .eq("academyId", academyId) as { data: StructuredPaymentRow[] | null; error: { message: string } | null };
  if (paymentsError) throw new Error(`Failed to load payments: ${paymentsError.message}`);

  // Score with whatever evidence exists. Missing sessions or payments lowers
  // confidence (see getStructuredRiskConfidence) rather than blocking scoring —
  // aggregate uploads store signals on the Student row, not as event rows.
  const sessionRows = sessions ?? [];
  const paymentRows = payments ?? [];

  const { data: uploads } = await db
    .from("Upload")
    .select("entityType, processedAt, uploadedAt")
    .eq("academyId", academyId)
    .eq("status", "PROCESSED") as { data: Array<{ entityType: string | null; processedAt: string | null; uploadedAt: string | null }> | null };

  const latestDataAt = latestDateFromUploads(uploads ?? []);
  const now = new Date();
  const canonicalStudents = buildStructuredStudentSignals({
    students,
    sessions: sessionRows,
    payments: paymentRows,
    now,
  });

  let studentsScored = 0;
  const riskCounts = { high: 0, medium: 0, low: 0 };
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  const warnings: string[] = [];
  const scoredAt = now.toISOString();
  for (const student of canonicalStudents) {
    const studentId = student.sourceStudentId ?? (student.rawData.sourceStudentId as string | undefined);
    if (!studentId) {
      warnings.push(`Skipped ${student.name}: missing source student id.`);
      continue;
    }

    // Prefer signals recomputed from event rows; fall back to values already
    // stored on the Student (e.g. from an aggregate upload) so they still count.
    const stored = storedById.get(studentId);
    const toDate = (value: unknown): Date | null => {
      if (!value) return null;
      const d = new Date(value as string);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const merged = {
      ...student,
      attendanceRate: student.attendanceRate ?? (typeof stored?.attendanceRate === "number" ? stored.attendanceRate : null),
      lastSessionDate: student.lastSessionDate ?? toDate(stored?.lastSessionDate),
      paymentStatus: student.paymentStatus ?? stored?.paymentStatus ?? null,
      lastPaymentDate: student.lastPaymentDate ?? toDate(stored?.lastPaymentDate),
      totalSessions: student.totalSessions ?? (typeof stored?.totalSessions === "number" ? stored.totalSessions : null),
    };

    const rule = computeRuleScore(merged, now);
    const structuredSignals = student.rawData.structuredSignals as { paymentRows?: number; countedSessions?: number } | undefined;
    const confidence = getStructuredRiskConfidence({
      hasStudentIdentifier: !!student.externalId,
      hasSessions: (structuredSignals?.countedSessions ?? 0) > 0 || merged.attendanceRate != null || merged.lastSessionDate != null,
      hasPayments: (structuredSignals?.paymentRows ?? 0) > 0 || merged.paymentStatus != null,
      latestDataAt,
      now,
    });
    const riskScore = Math.min(100, rule.score);
    const riskBand = getRiskBand(riskScore);

    const { error: updateError } = await db
      .from("Student")
      .update({
        lastSessionDate: merged.lastSessionDate?.toISOString() ?? null,
        attendanceRate: merged.attendanceRate,
        paymentStatus: merged.paymentStatus,
        lastPaymentDate: merged.lastPaymentDate?.toISOString() ?? null,
        totalSessions: merged.totalSessions,
        updatedAt: now.toISOString(),
      })
      .eq("id", studentId);
    if (updateError) throw new Error(`Failed to update structured student signals: ${updateError.message}`);

    const { error: riskError } = await db.from("RiskAssessment").insert({
      id: crypto.randomUUID(),
      studentId,
      uploadId,
      riskScore,
      riskBand,
      reasonsJson: [
        // Surface what the owner still needs to upload so a low-evidence student
        // reads as "needs data", not a confident "low risk".
        ...(merged.attendanceRate == null && !merged.lastSessionDate ? ["No attendance data uploaded yet"] : []),
        ...(!merged.paymentStatus && !merged.lastPaymentDate ? ["No payment data uploaded yet"] : []),
        ...rule.reasons,
        confidence.label,
      ] as unknown as Json,
      recommendedAction: recommendationForScore(riskScore),
      confidence: confidence.level === "high" ? 0.9 : confidence.level === "medium" ? 0.7 : 0.45,
      ruleScore: riskScore,
      aiModel: "structured-rules-v1",
    });
    if (riskError) throw new Error(`Failed to save risk assessment: ${riskError.message}`);

    if (riskBand === "HIGH") riskCounts.high++;
    if (riskBand === "MEDIUM") riskCounts.medium++;
    if (riskBand === "LOW") riskCounts.low++;
    confidenceCounts[confidence.level]++;
    studentsScored++;
  }

  if (confidenceCounts.medium > 0 || confidenceCounts.low > 0) {
    warnings.push("Some students were scored with incomplete session or payment evidence.");
  }

  return {
    studentsScored,
    sessionsUsed: sessionRows.length,
    paymentsUsed: paymentRows.length,
    riskCounts,
    confidenceCounts,
    scoredAt,
    warnings,
  };
}

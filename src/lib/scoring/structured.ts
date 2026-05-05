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

export async function runStructuredRiskScoring(academyId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: students, error: studentsError } = await (db as any)
    .from("Student")
    .select("id, name, externalId, contact, subject, tutor, feesAmount, rawDataJson")
    .eq("academyId", academyId) as { data: StructuredStudentRow[] | null; error: { message: string } | null };
  if (studentsError) throw new Error(`Failed to load students: ${studentsError.message}`);
  if (!students?.length) throw new Error("Import students before running risk scoring.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions, error: sessionsError } = await (db as any)
    .from("Session")
    .select("studentId, sessionDate, attendanceStatus, rawStatus")
    .eq("academyId", academyId) as { data: StructuredSessionRow[] | null; error: { message: string } | null };
  if (sessionsError) throw new Error(`Failed to load sessions: ${sessionsError.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payments, error: paymentsError } = await (db as any)
    .from("Payment")
    .select("studentId, paymentDate, paymentStatus, rawStatus, isLate, amount, overdueAmount")
    .eq("academyId", academyId) as { data: StructuredPaymentRow[] | null; error: { message: string } | null };
  if (paymentsError) throw new Error(`Failed to load payments: ${paymentsError.message}`);

  if (!sessions?.length || !payments?.length) {
    throw new Error("Import sessions and payments before running full risk scoring.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: uploads } = await (db as any)
    .from("Upload")
    .select("entityType, processedAt, uploadedAt")
    .eq("academyId", academyId)
    .eq("status", "PROCESSED") as { data: Array<{ entityType: string | null; processedAt: string | null; uploadedAt: string | null }> | null };

  const latestDataAt = latestDateFromUploads(uploads ?? []);
  const now = new Date();
  const canonicalStudents = buildStructuredStudentSignals({
    students,
    sessions,
    payments,
    now,
  });

  let studentsScored = 0;
  const riskCounts = { high: 0, medium: 0, low: 0 };
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  const warnings: string[] = [];
  const scoredAt = now.toISOString();
  for (const student of canonicalStudents) {
    const rule = computeRuleScore(student, now);
    const structuredSignals = student.rawData.structuredSignals as { paymentRows?: number; countedSessions?: number } | undefined;
    const confidence = getStructuredRiskConfidence({
      hasStudentIdentifier: !!student.externalId,
      hasSessions: (structuredSignals?.countedSessions ?? 0) > 0,
      hasPayments: (structuredSignals?.paymentRows ?? 0) > 0,
      latestDataAt,
      now,
    });
    const riskScore = Math.min(100, rule.score);
    const riskBand = getRiskBand(riskScore);

    if (riskBand === "HIGH") riskCounts.high++;
    if (riskBand === "MEDIUM") riskCounts.medium++;
    if (riskBand === "LOW") riskCounts.low++;
    confidenceCounts[confidence.level]++;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from("Student")
      .update({
        lastSessionDate: student.lastSessionDate?.toISOString() ?? null,
        attendanceRate: student.attendanceRate,
        paymentStatus: student.paymentStatus,
        lastPaymentDate: student.lastPaymentDate?.toISOString() ?? null,
        totalSessions: student.totalSessions,
        updatedAt: now.toISOString(),
      })
      .eq("id", student.rawData.sourceStudentId as string);
    if (updateError) throw new Error(`Failed to update structured student signals: ${updateError.message}`);

    const studentId = student.rawData.sourceStudentId as string | undefined;
    if (!studentId) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: riskError } = await (db as any).from("RiskAssessment").insert({
      id: crypto.randomUUID(),
      studentId,
      uploadId: null,
      riskScore,
      riskBand,
      reasonsJson: [
        ...rule.reasons,
        confidence.label,
      ] as unknown as Json,
      recommendedAction: recommendationForScore(riskScore),
      confidence: confidence.level === "high" ? 0.9 : confidence.level === "medium" ? 0.7 : 0.45,
      ruleScore: riskScore,
      aiModel: "structured-rules-v1",
    });
    if (riskError) throw new Error(`Failed to save risk assessment: ${riskError.message}`);
    studentsScored++;
  }

  if (confidenceCounts.medium > 0 || confidenceCounts.low > 0) {
    warnings.push("Some students were scored with incomplete session or payment evidence.");
  }

  return {
    studentsScored,
    sessionsUsed: sessions.length,
    paymentsUsed: payments.length,
    riskCounts,
    confidenceCounts,
    scoredAt,
    warnings,
    // Backward-compatible aliases for any older callers.
    scored: studentsScored,
    sessions: sessions.length,
    payments: payments.length,
    confidence: latestDataAt ? getStructuredRiskConfidence({
      hasStudentIdentifier: true,
      hasSessions: true,
      hasPayments: true,
      latestDataAt,
      now,
    }).level : "low",
  };
}

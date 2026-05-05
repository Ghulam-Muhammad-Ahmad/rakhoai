import { CanonicalStudentInput, RiskBand, RuleScoreResult } from "./types";

export function getRiskBand(score: number): RiskBand {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function computeRuleScore(
  student: CanonicalStudentInput,
  now = new Date()
): RuleScoreResult {
  let score = 0;
  const reasons: string[] = [];

  if (student.lastSessionDate) {
    const daysSinceLastSession = daysBetween(student.lastSessionDate, now);
    if (daysSinceLastSession > 14) {
      score += 30;
      reasons.push(`Has not attended a session in ${daysSinceLastSession} days`);
    }
  }

  if (typeof student.attendanceRate === "number" && student.attendanceRate < 75) {
    score += 25;
    reasons.push(`Attendance is ${student.attendanceRate}%`);
  }

  const payment = student.paymentStatus?.toLowerCase() ?? "";
  if (payment.includes("overdue") || payment.includes("unpaid") || payment.includes("late")) {
    score += 20;
    reasons.push(`Payment status is ${student.paymentStatus}`);
  }

  const structuredSignals = student.rawData.structuredSignals as
    | { paymentDataMissing?: boolean; latePayments?: number; rescheduledSessions?: number; cancelledSessions?: number }
    | undefined;

  if (structuredSignals?.paymentDataMissing) {
    reasons.push("Payment data missing for this student");
  }

  if (structuredSignals?.latePayments) {
    score += 10;
    reasons.push(`${structuredSignals.latePayments} late payment${structuredSignals.latePayments === 1 ? "" : "s"} detected`);
  }

  if (structuredSignals?.rescheduledSessions) {
    score += 5;
    reasons.push(`${structuredSignals.rescheduledSessions} rescheduled session${structuredSignals.rescheduledSessions === 1 ? "" : "s"} detected`);
  }

  if (structuredSignals?.cancelledSessions) {
    reasons.push(`${structuredSignals.cancelledSessions} cancelled session${structuredSignals.cancelledSessions === 1 ? "" : "s"} tracked separately`);
  }

  if (!student.tutor) {
    score += 10;
    reasons.push("No tutor is assigned");
  }

  return { score: Math.min(score, 100), reasons };
}

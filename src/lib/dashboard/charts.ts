import { getStudentRiskList } from "@/lib/students/risk";
import { db } from "@/lib/db/client";
import {
  buildAttendanceDistribution,
  buildRiskBreakdown,
  buildTopRecommendations,
  buildRetentionTrend,
  type RetentionAssessmentRow,
} from "./charts-core";

async function getRetentionAssessments(academyId: string): Promise<RetentionAssessmentRow[]> {
  const { data, error } = await db
    .from("Student")
    .select("riskAssessments:RiskAssessment(riskBand, computedAt)")
    .eq("academyId", academyId);

  if (error) throw new Error(`Failed to fetch retention data: ${error.message}`);

  return (data ?? []).flatMap(
    (s: { riskAssessments?: RetentionAssessmentRow[] | null }) =>
      s.riskAssessments ?? []
  );
}

export async function getDashboardCharts(academyId: string) {
  const [students, assessments] = await Promise.all([
    getStudentRiskList(academyId, { sort: "riskScore", direction: "desc" }),
    getRetentionAssessments(academyId),
  ]);

  const rows = students.map((student) => ({
    riskBand: student.riskBand as "HIGH" | "MEDIUM" | "LOW" | null,
    riskScore: student.riskScore,
    attendanceRate: student.attendanceRate,
    recommendedAction: student.recommendedAction,
    studentName: student.name,
  }));

  return {
    riskBreakdown: buildRiskBreakdown(rows),
    attendance: buildAttendanceDistribution(rows),
    recommendations: buildTopRecommendations(rows),
    retentionTrend: buildRetentionTrend(assessments),
  };
}

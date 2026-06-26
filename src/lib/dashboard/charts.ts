import { getStudentRiskList } from "@/lib/students/risk";
import { adminDb } from "@/lib/db/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import {
  buildAttendanceDistribution,
  buildRiskBreakdown,
  buildTopRecommendations,
  buildRetentionTrend,
  type RetentionAssessmentRow,
} from "./charts-core";

async function getRetentionAssessments(
  academyId: string,
  client?: SupabaseClient<Database>
): Promise<RetentionAssessmentRow[]> {
  const db = client ?? adminDb;
  const { data, error } = await db
    .from("Student")
    .select("riskAssessments:RiskAssessment(studentId, riskBand, computedAt)")
    .eq("academyId", academyId);

  if (error) throw new Error(`Failed to fetch retention data`);

  return (data ?? []).flatMap(
    (s: { riskAssessments?: RetentionAssessmentRow[] | null }) =>
      s.riskAssessments ?? []
  );
}

export async function getDashboardCharts(
  academyId: string,
  client?: SupabaseClient<Database>
) {
  const [students, assessments] = await Promise.all([
    getStudentRiskList(academyId, { sort: "riskScore", direction: "desc" }, "$", client),
    getRetentionAssessments(academyId, client),
  ]);

  const rows = students.map((student) => ({
    riskBand: student.riskBand as "HIGH" | "MEDIUM" | "LOW" | null,
    riskScore: student.riskScore,
    attendanceRate: student.attendanceRate,
    recommendedAction: student.recommendedAction,
    studentName: student.name,
    riskLevel: student.riskLevel,
  }));

  return {
    riskBreakdown: buildRiskBreakdown(rows),
    attendance: buildAttendanceDistribution(rows),
    recommendations: buildTopRecommendations(rows),
    retentionTrend: buildRetentionTrend(assessments),
  };
}

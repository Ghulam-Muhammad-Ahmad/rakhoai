import { db } from "@/lib/db/client";

export type DashboardSummary = {
  totalStudents: number;
  highRiskCount: number;
  mediumRiskCount: number;
  estimatedRevenueAtRisk: number;
  studentsSavedThisMonth: number;
};

function startOfMonth(date: Date): string {
  // Build the boundary in UTC so it matches the UTC-stored takenAt timestamps —
  // a server in a non-UTC timezone would otherwise mis-bucket actions taken in
  // the first/last hours of the month.
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

export async function getDashboardSummary(
  academyId: string,
  now = new Date()
): Promise<DashboardSummary> {
  // Fetch all students with their latest risk assessment
  type StudentRow = {
    id: string;
    feesAmount: string | null;
    riskAssessments: { riskBand: string; computedAt: string }[];
  };

  const { data: rawStudents, error } = await db
    .from("Student")
    .select(`
      id,
      feesAmount,
      riskAssessments:RiskAssessment(riskBand, computedAt)
    `)
    .eq("academyId", academyId);

  if (error) throw new Error(`Failed to fetch students: ${error.message}`);

  const students = (rawStudents ?? []) as unknown as StudentRow[];

  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let estimatedRevenueAtRisk = 0;

  for (const student of students) {
    const assessments = (student.riskAssessments ?? []) as { riskBand: string; computedAt: string }[];
    if (assessments.length === 0) continue;

    // Latest by computedAt
    const latest = assessments.sort(
      (a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime()
    )[0];

    if (latest.riskBand === "HIGH") {
      highRiskCount += 1;
      estimatedRevenueAtRisk += Number(student.feesAmount ?? 0);
    }
    if (latest.riskBand === "MEDIUM") {
      mediumRiskCount += 1;
    }
  }

  // Count DISTINCT students saved this month — a student can have multiple
  // STUDENT_SAVED action rows, which would otherwise inflate the headline.
  const { data: savedRows, error: countError } = await db
    .from("Action")
    .select("studentId")
    .eq("academyId", academyId)
    .eq("status", "STUDENT_SAVED")
    .gte("takenAt", startOfMonth(now));

  if (countError) throw new Error(`Failed to count saved students: ${countError.message}`);

  const studentsSavedThisMonth = new Set(
    (savedRows ?? []).map((r: { studentId: string | null }) => r.studentId).filter(Boolean)
  ).size;

  return {
    totalStudents: students.length,
    highRiskCount,
    mediumRiskCount,
    estimatedRevenueAtRisk,
    studentsSavedThisMonth,
  };
}

import { prisma } from "@/lib/db/prisma";

export type DashboardSummary = {
  totalStudents: number;
  highRiskCount: number;
  mediumRiskCount: number;
  estimatedRevenueAtRisk: number;
  studentsSavedThisMonth: number;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getDashboardSummary(
  academyId: string,
  now = new Date()
): Promise<DashboardSummary> {
  const students = await prisma.student.findMany({
    where: { academyId },
    include: { riskAssessments: { orderBy: { computedAt: "desc" }, take: 1 } },
  });

  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let estimatedRevenueAtRisk = 0;

  for (const student of students) {
    const latest = student.riskAssessments[0];
    if (!latest) continue;

    if (latest.riskBand === "HIGH") {
      highRiskCount += 1;
      estimatedRevenueAtRisk += Number(student.feesAmount ?? 0);
    }

    if (latest.riskBand === "MEDIUM") {
      mediumRiskCount += 1;
    }
  }

  const studentsSavedThisMonth = await prisma.action.count({
    where: {
      academyId,
      status: "STUDENT_SAVED",
      takenAt: { gte: startOfMonth(now) },
    },
  });

  return {
    totalStudents: students.length,
    highRiskCount,
    mediumRiskCount,
    estimatedRevenueAtRisk,
    studentsSavedThisMonth,
  };
}

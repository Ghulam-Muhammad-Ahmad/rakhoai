export type TutorStatsInput = {
  tutorName: string | null;
  riskBand: "HIGH" | "MEDIUM" | "LOW" | null;
  riskScore: number | null;
  attendanceRate: number | null;
  feesAmount: number | null;
  actionStatus: string | null;
};

export type TutorStats = {
  name: string;
  assignedStudents: number;
  highRiskStudents: number;
  mediumRiskStudents: number;
  averageRiskScore: number;
  averageAttendance: number;
  revenueAtRisk: number;
  pendingActions: number;
  studentsSaved: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildTutorStats(rows: TutorStatsInput[]): TutorStats[] {
  const grouped = new Map<string, TutorStatsInput[]>();

  for (const row of rows) {
    const name = row.tutorName?.trim() || "Unassigned";
    grouped.set(name, [...(grouped.get(name) ?? []), row]);
  }

  return [...grouped.entries()]
    .map(([name, tutorRows]) => ({
      name,
      assignedStudents: tutorRows.length,
      highRiskStudents: tutorRows.filter((row) => row.riskBand === "HIGH").length,
      mediumRiskStudents: tutorRows.filter((row) => row.riskBand === "MEDIUM").length,
      averageRiskScore: average(tutorRows.flatMap((row) => row.riskScore === null ? [] : [row.riskScore])),
      averageAttendance: average(tutorRows.flatMap((row) => row.attendanceRate === null ? [] : [row.attendanceRate])),
      revenueAtRisk: tutorRows
        .filter((row) => row.riskBand === "HIGH")
        .reduce((sum, row) => sum + (row.feesAmount ?? 0), 0),
      pendingActions: tutorRows.filter((row) => row.actionStatus === "PENDING" || row.actionStatus === "IN_PROGRESS").length,
      studentsSaved: tutorRows.filter((row) => row.actionStatus === "STUDENT_SAVED").length,
    }))
    .sort((a, b) => b.highRiskStudents - a.highRiskStudents || b.averageRiskScore - a.averageRiskScore || a.name.localeCompare(b.name));
}

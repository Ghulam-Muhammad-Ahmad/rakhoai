export type DashboardRiskRow = {
  riskBand: "HIGH" | "MEDIUM" | "LOW" | null;
  riskScore: number | null;
  attendanceRate: number | null;
  recommendedAction: string | null;
  studentName: string;
};

export function buildRiskBreakdown(rows: DashboardRiskRow[]) {
  const high = rows.filter((row) => row.riskBand === "HIGH").length;
  const medium = rows.filter((row) => row.riskBand === "MEDIUM").length;
  const low = rows.filter((row) => row.riskBand === "LOW" || row.riskBand === null).length;

  return [
    { label: "High", value: high, color: "#DC2626" },
    { label: "Medium", value: medium, color: "#F59E0B" },
    { label: "Low", value: low, color: "#10B981" },
  ];
}

export function buildAttendanceDistribution(rows: DashboardRiskRow[]) {
  const labels = ["0-59", "60-79", "80-89", "90+"];
  const values = [0, 0, 0, 0];

  for (const row of rows) {
    const value = row.attendanceRate;
    if (value === null) continue;
    if (value < 60) values[0] += 1;
    else if (value < 80) values[1] += 1;
    else if (value < 90) values[2] += 1;
    else values[3] += 1;
  }

  return { labels, values };
}

export function buildTopRecommendations(rows: DashboardRiskRow[]) {
  return rows
    .filter((row) => row.recommendedAction && (row.riskBand === "HIGH" || row.riskBand === "MEDIUM"))
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 3)
    .map((row) => ({
      studentName: row.studentName,
      riskBand: row.riskBand,
      riskScore: row.riskScore,
      recommendedAction: row.recommendedAction,
    }));
}

export type RetentionAssessmentRow = {
  riskBand: string | null;
  computedAt: string | null;
};

export function buildRetentionTrend(assessments: RetentionAssessmentRow[]): { month: string; rate: number }[] {
  const now = new Date();
  const result: { month: string; rate: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString("en", { month: "short" });
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const prefix = `${year}-${month}`;

    const inMonth = assessments.filter(
      (a) => a.computedAt != null && a.computedAt.startsWith(prefix)
    );

    if (inMonth.length === 0) {
      result.push({ month: monthLabel, rate: 0 });
      continue;
    }

    const retained = inMonth.filter(
      (a) => a.riskBand === "LOW" || a.riskBand === null
    ).length;

    result.push({
      month: monthLabel,
      rate: Math.round((retained / inMonth.length) * 100),
    });
  }

  return result;
}

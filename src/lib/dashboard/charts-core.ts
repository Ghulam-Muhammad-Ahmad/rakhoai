export type DashboardRiskRow = {
  riskBand: "HIGH" | "MEDIUM" | "LOW" | null;
  riskScore: number | null;
  attendanceRate: number | null;
  recommendedAction: string | null;
  studentName: string;
  // "needs_data" when the student is band LOW but lacks the evidence to score
  // meaningfully — kept separate so they aren't presented as genuinely low risk.
  riskLevel?: "high" | "medium" | "low" | "unscored" | "needs_data";
};

export function buildRiskBreakdown(rows: DashboardRiskRow[]) {
  const high = rows.filter((row) => row.riskBand === "HIGH").length;
  const medium = rows.filter((row) => row.riskBand === "MEDIUM").length;
  // Split band LOW into genuinely-low vs needs-more-data (insufficient evidence).
  const needsData = rows.filter((row) => row.riskLevel === "needs_data").length;
  const low = rows.filter((row) => row.riskBand === "LOW" && row.riskLevel !== "needs_data").length;
  const unscored = rows.filter((row) => row.riskBand === null).length;

  return [
    { label: "High", value: high, color: "#DC2626" },
    { label: "Medium", value: medium, color: "#F59E0B" },
    { label: "Low", value: low, color: "#10B981" },
    { label: "Needs data", value: needsData, color: "#CBD5E1" },
    { label: "Not scored", value: unscored, color: "#9CA3AF" },
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
  studentId?: string | null;
  riskBand: string | null;
  computedAt: string | null;
};

// Low-risk share per month. NOTE: this buckets by `computedAt` (when scoring ran),
// not by when retention actually happened — it is a "low-risk share by scoring
// month" proxy, not a true retention metric. Months with no scoring run return
// rate=null (rendered as a gap) so the chart never implies a false 0% cliff.
// Within a month, each student is counted once (their latest assessment that
// month), so re-running scoring twice in a month does not skew the share.
export function buildRetentionTrend(assessments: RetentionAssessmentRow[]): { month: string; rate: number | null }[] {
  const now = new Date();
  const result: { month: string; rate: number | null }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString("en", { month: "short" });
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const inMonth = assessments.filter(
      (a) => a.computedAt != null && a.computedAt.startsWith(prefix)
    );

    if (inMonth.length === 0) {
      result.push({ month: monthLabel, rate: null });
      continue;
    }

    // Dedup to one assessment per student per month (latest by computedAt).
    const latestByStudent = new Map<string, RetentionAssessmentRow>();
    for (const a of inMonth) {
      const key = a.studentId ?? `${a.computedAt}`;
      const existing = latestByStudent.get(key);
      if (!existing || (a.computedAt ?? "") > (existing.computedAt ?? "")) {
        latestByStudent.set(key, a);
      }
    }

    const deduped = [...latestByStudent.values()];
    const retained = deduped.filter((a) => a.riskBand === "LOW").length;

    result.push({
      month: monthLabel,
      rate: Math.round((retained / deduped.length) * 100),
    });
  }

  return result;
}

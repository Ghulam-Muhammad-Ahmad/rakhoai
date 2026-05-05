import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import StatCard from "@/components/ui/StatCard";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { AreaChart, BarChart, Donut } from "@/components/ui/Charts";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { getDashboardCharts } from "@/lib/dashboard/charts";
import { getStudentRiskList } from "@/lib/students/risk";
import { getCurrencySymbol } from "@/lib/currency";
import { RiskScoringButton } from "@/components/dashboard/RiskScoringButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser?.academy) redirect("/onboarding");

  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);
  const { db } = await import("@/lib/db/client");
  const { data: lastUpload } = await db
    .from("Upload")
    .select("processedAt, fileName, rowCount")
    .eq("academyId", dbUser.academy.id)
    .eq("status", "PROCESSED")
    .order("processedAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entityUploads } = await (db as any)
    .from("Upload")
    .select("entityType, processedAt, uploadedAt")
    .eq("academyId", dbUser.academy.id)
    .eq("status", "PROCESSED")
    .order("processedAt", { ascending: false });

  const summary = await getDashboardSummary(dbUser.academy.id);
  const charts = await getDashboardCharts(dbUser.academy.id);
  const atRisk = await getStudentRiskList(dbUser.academy.id, {
    band: "AT_RISK",
    sort: "riskScore",
    direction: "desc",
  }, currencySymbol);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const headlines = [
    "Let’s see who needs you today",
    "A few students could use your attention",
    "Here’s what’s changed since you were last here",
    "Some students are slipping — let’s catch them early",
    "Your retention picture, right now",
    "Who’s at risk today?",
    "Time to check in on your students",
  ];
  const headline = headlines[new Date().getDate() % headlines.length];
  const lastByEntity = new Map<string, string>();
  for (const upload of entityUploads ?? []) {
    const entityType = upload.entityType ?? "students";
    if (!lastByEntity.has(entityType)) {
      lastByEntity.set(entityType, upload.processedAt ?? upload.uploadedAt);
    }
  }
  const hasSessions = lastByEntity.has("sessions");
  const hasPayments = lastByEntity.has("payments");
  const hasStructuredRisk = hasSessions && hasPayments;

  return (
    <div className="page-fade">
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>{greeting}, {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>
            {headline}
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <RiskScoringButton disabled={!hasStructuredRisk || summary.totalStudents === 0} />
          <Link href="/uploads/new" style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: lastUpload ? "1px solid var(--neutral-200)" : "none", background: lastUpload ? "#fff" : "var(--primary-500)", color: lastUpload ? "var(--neutral-700)" : "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            {lastUpload ? <><RefreshCw size={14} /> Update data</> : "Upload data"}
          </Link>
          {lastUpload?.processedAt && (
            <div style={{ fontSize: 12, color: "var(--neutral-400)", textAlign: "right" }}>
              Last updated {new Date(lastUpload.processedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {lastUpload.rowCount ? ` · ${lastUpload.rowCount.toLocaleString()} students` : ""}
              {lastUpload.fileName ? ` · ${lastUpload.fileName}` : ""}
            </div>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard tinted eyebrow="Total students" value={summary.totalStudents.toLocaleString()} sub={dbUser.academy.name} />
        <StatCard eyebrow="High risk" value={summary.highRiskCount.toLocaleString()} sub={`${summary.mediumRiskCount} medium risk`} deltaTone="down" />
        <StatCard eyebrow="Revenue at risk" value={`${currencySymbol}${summary.estimatedRevenueAtRisk.toLocaleString()}`} sub="high-risk active fees" />
        <StatCard eyebrow="Students saved" value={summary.studentsSavedThisMonth.toLocaleString()} sub="this month" />
      </div>

      {!hasStructuredRisk && summary.totalStudents > 0 && (
        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 8, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#78350F", fontSize: 13, lineHeight: 1.55 }}>
          <strong>No churn prediction yet.</strong> Students are imported, but Rakho AI needs session history and payment data before showing full risk scores.
          {!hasSessions ? " Upload sessions to unlock attendance and recency risk." : ""}
          {!hasPayments ? " Upload payments to improve fee-risk accuracy." : ""}
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Retention trend</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>Last 12 months</div>
          </div>
          <AreaChart data={charts.retentionTrend} />
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 14 }}>Risk breakdown</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut data={charts.riskBreakdown} size={120} thickness={14} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {charts.riskBreakdown.map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--neutral-700)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                    {r.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--neutral-900)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Attendance · today</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>All centers</div>
          </div>
          <BarChart data={charts.attendance.labels.map((label, i) => ({ label, value: charts.attendance.values[i] }))} />
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 16 }}>
        {/* At-risk table */}
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Watching the door</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{atRisk.length} students · sorted by risk</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px", padding: "0 4px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
            <div>Student</div><div>Subject</div><div>Attendance</div><div>Risk</div><div>Fees</div><div />
          </div>
          {atRisk.slice(0, 6).map(student => (
            <Link key={student.id} href={`/students/${student.id}`} style={{
              display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px",
              padding: "10px 4px", alignItems: "center", borderTop: "1px solid var(--neutral-100)",
              fontSize: 14, cursor: "pointer", textDecoration: "none",
              gap: 12, color: "inherit",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <Avatar initials={student.initials} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.name}</div>
                  <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{student.externalId ?? student.id}</div>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{student.classLabel}</div>
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)" }}>{student.attendanceLabel}</div>
              <div><RiskBadge level={student.riskLevel} /></div>
              <div style={{ fontFamily: "var(--font-mono)", color: /overdue|unpaid/i.test(student.feeLabel) ? "var(--error)" : "var(--neutral-700)" }}>{student.feeLabel}</div>
              <div style={{ color: "var(--neutral-400)", textAlign: "right" }}>›</div>
            </Link>
          ))}
          {atRisk.length === 0 && (
            <div style={{ padding: "30px 4px 10px", borderTop: "1px solid var(--neutral-100)", fontSize: 14, color: "var(--neutral-500)", textAlign: "center" }}>
              No high or medium risk students yet.
            </div>
          )}
        </div>

        {/* AI suggestions */}
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>AI suggestions</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{charts.recommendations.length} pending</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {charts.recommendations.map((iv) => (
              <div key={`${iv.studentName}-${iv.riskScore}`} style={{
                background: "var(--primary-50)", border: "1px solid var(--primary-100)",
                borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--primary-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13 }}>R</div>
                <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.55 }}>
                  <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }}>{iv.studentName}</strong>
                  {" · "}<span style={{ color: "var(--neutral-500)" }}>{iv.riskBand?.toLowerCase()} risk</span>
                  <div style={{ marginTop: 6 }}>{iv.recommendedAction}</div>
                </div>
              </div>
            ))}
            {charts.recommendations.length === 0 && (
              <div style={{ fontSize: 14, color: "var(--neutral-500)", lineHeight: 1.5 }}>
                No recommendations yet. Upload and score student data to populate this panel.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

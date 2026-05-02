import { Download, Plus } from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { AreaChart, BarChart, Donut } from "@/components/ui/Charts";
import {
  STUDENTS, RISK_BREAKDOWN, RETENTION_TREND,
  ATTENDANCE_BARS, ATTENDANCE_LABELS, INTERVENTIONS,
} from "@/lib/data";

export default function DashboardPage() {
  const atRisk = STUDENTS.filter(s => s.risk !== "safe");

  return (
    <div className="page-fade">
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Good morning, Ayesha</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>
            Let&apos;s see who needs you today
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Download size={14} /> Export
          </button>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Plus size={14} /> Add student
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard tinted eyebrow="Total students" value="1,248" sub="across 6 centers" delta="+4.2%" />
        <StatCard eyebrow="At risk this week" value="24" sub="6 critical · 18 high" delta="+3" deltaTone="down" />
        <StatCard eyebrow="Retention · 30d" value="93%" sub="vs 91% last month" delta="+2.0%" />
        <StatCard eyebrow="Recovered" value="11" sub="after intervention" delta="+5" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Retention trend</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>Last 12 months</div>
          </div>
          <AreaChart values={RETENTION_TREND} />
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 14 }}>Risk breakdown</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut data={RISK_BREAKDOWN} size={120} thickness={14} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {RISK_BREAKDOWN.map(r => (
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
          <BarChart values={ATTENDANCE_BARS} labels={ATTENDANCE_LABELS} />
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 16 }}>
        {/* At-risk table */}
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Watching the door</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>24 students · sorted by risk</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px", padding: "0 4px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
            <div>Student</div><div>Class</div><div>Attendance</div><div>Risk</div><div>Fees</div><div />
          </div>
          {atRisk.slice(0, 6).map(s => (
            <Link key={s.id} href={`/students/${s.id}`} style={{
              display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px",
              padding: "10px 4px", alignItems: "center", borderTop: "1px solid var(--neutral-100)",
              fontSize: 14, cursor: "pointer", textDecoration: "none",
              gap: 12, color: "inherit",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <Avatar initials={s.initials} tone={s.tone} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{s.id}</div>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{s.classLabel}</div>
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)" }}>{s.attendance}%</div>
              <div><RiskBadge level={s.risk} /></div>
              <div style={{ fontFamily: "var(--font-mono)", color: s.fee.startsWith("On") ? "var(--neutral-700)" : "var(--error)" }}>{s.fee}</div>
              <div style={{ color: "var(--neutral-400)", textAlign: "right" }}>›</div>
            </Link>
          ))}
        </div>

        {/* AI suggestions */}
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>AI suggestions</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>3 pending</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {INTERVENTIONS.map(iv => (
              <div key={iv.id} style={{
                background: "var(--primary-50)", border: "1px solid var(--primary-100)",
                borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--primary-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13 }}>R</div>
                <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.55 }}>
                  <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }}>{iv.student}</strong>
                  {" · "}<span style={{ color: "var(--neutral-500)" }}>{iv.suggested}</span>
                  <div style={{ marginTop: 6 }}>{iv.text}</div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--neutral-500)", marginTop: 6 }}>{iv.when}</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer" }}>Approve</button>
                    <button style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--neutral-700)", cursor: "pointer" }}>Edit draft</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

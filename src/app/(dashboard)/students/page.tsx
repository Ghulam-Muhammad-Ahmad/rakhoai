"use client";
import { useState } from "react";
import { Search, Upload, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { STUDENTS, type RiskLevel } from "@/lib/data";

type Filter = "all" | RiskLevel;

export default function StudentsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: STUDENTS.length },
    { key: "critical", label: "Critical", count: STUDENTS.filter(s => s.risk === "critical").length },
    { key: "high",     label: "High",     count: STUDENTS.filter(s => s.risk === "high").length },
    { key: "medium",   label: "Medium",   count: STUDENTS.filter(s => s.risk === "medium").length },
    { key: "safe",     label: "Safe",     count: STUDENTS.filter(s => s.risk === "safe").length },
  ];

  const list = STUDENTS
    .filter(s => filter === "all" || s.risk === filter)
    .filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.id.includes(query));

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Roster · Bright Future Academy</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Students</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/uploads/new")} style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Upload size={14} /> Import CSV
          </button>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Plus size={14} /> Add student
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        {/* Filter bar */}
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--neutral-100)", flexWrap: "wrap" }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)",
                border: "none", cursor: "pointer",
                background: filter === f.key ? "var(--primary-500)" : "transparent",
                color: filter === f.key ? "#fff" : "var(--neutral-600)",
              }}
            >
              {f.label} <span style={{ opacity: 0.7 }}>{f.count}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)", background: "var(--neutral-50)", maxWidth: 260 }}>
            <Search size={14} color="var(--neutral-400)" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or ID"
              style={{ border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 14, color: "var(--neutral-800)", width: "100%" }}
            />
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
          <div>Student</div><div>Class</div><div>Attendance</div><div>Risk</div><div>Fees</div><div />
        </div>

        {list.map(s => (
          <Link key={s.id} href={`/students/${s.id}`} style={{
            display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px",
            padding: "12px 20px", alignItems: "center",
            borderBottom: "1px solid var(--neutral-100)", gap: 12,
            fontSize: 14, cursor: "pointer", textDecoration: "none", color: "inherit",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Avatar initials={s.initials} tone={s.tone} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{s.id} · joined {s.joined}</div>
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{s.classLabel}</div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)" }}>{s.attendance}%</div>
            <div><RiskBadge level={s.risk} /></div>
            <div style={{ fontFamily: "var(--font-mono)", color: s.fee.startsWith("On") ? "var(--neutral-700)" : "var(--error)" }}>{s.fee}</div>
            <div style={{ color: "var(--neutral-400)", textAlign: "right" }}>›</div>
          </Link>
        ))}

        {list.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
            No students match that filter.
          </div>
        )}
      </div>
    </div>
  );
}

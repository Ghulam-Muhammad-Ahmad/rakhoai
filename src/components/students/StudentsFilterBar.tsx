"use client";

import { Search } from "lucide-react";
import type { StudentRiskListItem } from "@/lib/students/risk";

const bands = [
  { key: "ALL", label: "All" },
  { key: "HIGH", label: "High" },
  { key: "MEDIUM", label: "Medium" },
  { key: "LOW", label: "Low" },
  { key: "AT_RISK", label: "At risk" },
];

export function StudentsFilterBar({
  students,
  band,
  sort,
  q,
  onBand,
  onSort,
  onQuery,
}: {
  students: StudentRiskListItem[];
  band: string;
  sort: string;
  q: string;
  onBand: (value: string) => void;
  onSort: (value: string) => void;
  onQuery: (value: string) => void;
}) {
  const counts = {
    ALL: students.length,
    HIGH: students.filter((student) => student.riskBand === "HIGH").length,
    MEDIUM: students.filter((student) => student.riskBand === "MEDIUM").length,
    LOW: students.filter((student) => student.riskBand === "LOW").length,
    AT_RISK: students.filter((student) => student.riskBand === "HIGH" || student.riskBand === "MEDIUM").length,
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--neutral-100)", flexWrap: "wrap" }}>
      {bands.map((b) => (
        <button
          key={b.key}
          onClick={() => onBand(b.key)}
          style={{
            fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)",
            border: "none", cursor: "pointer",
            background: band === b.key ? "var(--primary-500)" : "transparent",
            color: band === b.key ? "#fff" : "var(--neutral-600)",
          }}
        >
          {b.label} <span style={{ opacity: 0.7 }}>{counts[b.key as keyof typeof counts]}</span>
        </button>
      ))}
      <select
        value={sort}
        onChange={(event) => onSort(event.target.value)}
        style={{ fontSize: 13, padding: "7px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-700)" }}
      >
        <option value="riskScore">Risk score</option>
        <option value="lastSessionDate">Last session</option>
        <option value="feesAmount">Fees</option>
        <option value="name">Name</option>
      </select>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)", background: "var(--neutral-50)", maxWidth: 280 }}>
        <Search size={14} color="var(--neutral-400)" />
        <input
          value={q}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search by name, ID, tutor"
          style={{ border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 14, color: "var(--neutral-800)", width: "100%" }}
        />
      </div>
    </div>
  );
}

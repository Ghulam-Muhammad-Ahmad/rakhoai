"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedRows } from "@/components/ui/usePaginatedRows";
import type { StudentRiskListItem } from "@/lib/students/risk";

export type StudentTableFilters = {
  band?: string;
  tutor?: string;
  subject?: string;
  q?: string;
  sort?: string;
  direction?: string;
};

export function StudentsBulkTable({ filters }: { filters: StudentTableFilters }) {
  const { rows, total, page, setPage, perPage, setPerPage, loading, reload } =
    usePaginatedRows<StudentRiskListItem>("/api/students", filters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const selectedIds = useMemo(() => [...selected], [selected]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => current.size === rows.length ? new Set() : new Set(rows.map((row) => row.id)));
  }

  async function deleteIds(ids: string[]) {
    if (ids.length === 0) return;
    const label = ids.length === 1 ? "this student" : `${ids.length} students`;
    if (!window.confirm(`Delete ${label}? This also removes their risk history, interventions, payments, and sessions.`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Delete failed");
      setSelected(new Set());
      await reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete students");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--neutral-100)", background: selected.size > 0 ? "var(--primary-50)" : "#fff" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--neutral-600)" }}>
          <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} aria-label="Select all students" />
          {selected.size > 0 ? `${selected.size} selected` : `${total} student${total !== 1 ? "s" : ""}`}
        </label>
        <button
          disabled={deleting || selectedIds.length === 0}
          onClick={() => deleteIds(selectedIds)}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 8, border: "1px solid #FECACA", background: selectedIds.length ? "#FEF2F2" : "var(--neutral-50)", color: selectedIds.length ? "var(--error)" : "var(--neutral-400)", fontSize: 13, fontWeight: 600, cursor: selectedIds.length ? "pointer" : "not-allowed", opacity: deleting ? 0.6 : 1 }}
        >
          <Trash2 size={14} /> Delete selected
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 720 }}>
      <div style={{ display: "grid", gridTemplateColumns: "32px 1.8fr 0.9fr 0.9fr 1fr 1fr 0.8fr 44px", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
        <div /><div>Student</div><div>Subject</div><div>Tutor</div><div>Attendance</div><div>Risk</div><div>Fees</div><div />
      </div>

      {rows.map((student) => (
        <div key={student.id} style={{
          display: "grid", gridTemplateColumns: "32px 1.8fr 0.9fr 0.9fr 1fr 1fr 0.8fr 44px",
          padding: "12px 20px", alignItems: "center",
          borderBottom: "1px solid var(--neutral-100)", gap: 12,
          fontSize: 14,
        }}>
          <input type="checkbox" checked={selected.has(student.id)} onChange={() => toggle(student.id)} aria-label={`Select ${student.name}`} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Avatar initials={student.initials} />
            <div style={{ minWidth: 0 }}>
              <Link href={`/students/${student.id}`} style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textDecoration: "none" }}>{student.name}</Link>
              <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{student.externalId ?? student.id} - joined {student.joinedLabel}</div>
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.classLabel}</div>
          <div style={{ fontSize: 13, color: student.tutor ? "var(--neutral-700)" : "var(--neutral-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.tutor ?? "-"}</div>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)" }}>{student.attendanceLabel}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiskBadge level={student.riskLevel} />
            {student.riskScore !== null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--neutral-500)" }}>{student.riskScore}</span>}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", color: /overdue|unpaid/i.test(student.feeLabel) ? "var(--error)" : "var(--neutral-700)" }}>{student.feeLabel}</div>
          <button
            disabled={deleting}
            onClick={() => deleteIds([student.id])}
            aria-label={`Delete ${student.name}`}
            title="Delete student"
            style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-500)", cursor: "pointer" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {loading && rows.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>Loading…</div>
      )}
      {!loading && rows.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
          No students match that filter.
        </div>
      )}
      </div>
      </div>

      <Pagination page={page} perPage={perPage} total={total} loading={loading} onPageChange={setPage} onPerPageChange={setPerPage} />
    </>
  );
}

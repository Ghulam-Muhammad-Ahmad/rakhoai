"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedRows } from "@/components/ui/usePaginatedRows";
import type { TutorStats } from "@/lib/tutors/tutor-core";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TutorsBulkTable({ currencySymbol }: { currencySymbol: string }) {
  const { rows, total, page, setPage, perPage, setPerPage, loading, reload } =
    usePaginatedRows<TutorStats>("/api/tutors", {});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const selectedNames = useMemo(() => [...selected], [selected]);
  const deletableRows = rows.filter((row) => row.name !== "Unassigned");

  function toggle(name: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => current.size === deletableRows.length ? new Set() : new Set(deletableRows.map((row) => row.name)));
  }

  async function deleteNames(names: string[]) {
    if (names.length === 0) return;
    const label = names.length === 1 ? names[0] : `${names.length} tutors`;
    if (!window.confirm(`Delete ${label}? Assigned students will be kept and moved to Unassigned.`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/tutors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Delete failed");
      setSelected(new Set());
      await reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete tutors");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--neutral-100)", background: selected.size > 0 ? "var(--primary-50)" : "#fff" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--neutral-600)" }}>
          <input type="checkbox" checked={deletableRows.length > 0 && selected.size === deletableRows.length} onChange={toggleAll} aria-label="Select all tutors" />
          {selected.size > 0 ? `${selected.size} selected` : `${total} tutor${total !== 1 ? "s" : ""}`}
        </label>
        <button disabled={deleting || selectedNames.length === 0} onClick={() => deleteNames(selectedNames)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 8, border: "1px solid #FECACA", background: selectedNames.length ? "#FEF2F2" : "var(--neutral-50)", color: selectedNames.length ? "var(--error)" : "var(--neutral-400)", fontSize: 13, fontWeight: 600, cursor: selectedNames.length ? "pointer" : "not-allowed", opacity: deleting ? 0.6 : 1 }}>
          <Trash2 size={14} /> Delete selected
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 900 }}>
      <div style={{ display: "grid", gridTemplateColumns: "32px 1.8fr 0.7fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 0.7fr 44px", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
        <div /><div>Tutor</div><div>Students</div><div>High risk</div><div>Medium</div><div>Avg risk</div><div>Attendance</div><div>Revenue risk</div><div>Pending</div><div />
      </div>

      {rows.map((tutor) => (
        <div key={tutor.name} style={{ display: "grid", gridTemplateColumns: "32px 1.8fr 0.7fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 0.7fr 44px", padding: "12px 20px", alignItems: "center", borderBottom: "1px solid var(--neutral-100)", gap: 12, fontSize: 14 }}>
          <input type="checkbox" checked={selected.has(tutor.name)} disabled={tutor.name === "Unassigned"} onChange={() => toggle(tutor.name)} aria-label={`Select ${tutor.name}`} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Avatar initials={getInitials(tutor.name)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tutor.name}</div>
              <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{tutor.studentsSaved} saved this month</div>
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{tutor.assignedStudents}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: tutor.highRiskStudents > 0 ? "var(--error)" : "var(--neutral-400)", fontWeight: tutor.highRiskStudents > 0 ? 700 : 400 }}>{tutor.highRiskStudents}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: tutor.mediumRiskStudents > 0 ? "#D97706" : "var(--neutral-400)", fontWeight: tutor.mediumRiskStudents > 0 ? 600 : 400 }}>{tutor.mediumRiskStudents}</div>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{tutor.averageRiskScore}</div>
          <div style={{ fontFamily: "var(--font-mono)", color: tutor.averageAttendance < 70 ? "var(--error)" : tutor.averageAttendance < 85 ? "#D97706" : "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{tutor.averageAttendance}%</div>
          <div style={{ fontFamily: "var(--font-mono)", color: tutor.revenueAtRisk > 0 ? "var(--error)" : "var(--neutral-400)", fontVariantNumeric: "tabular-nums" }}>{tutor.revenueAtRisk > 0 ? `${currencySymbol}${tutor.revenueAtRisk.toLocaleString()}` : "-"}</div>
          <div style={{ fontFamily: "var(--font-mono)", color: tutor.pendingActions > 0 ? "var(--warning)" : "var(--neutral-400)", fontVariantNumeric: "tabular-nums" }}>{tutor.pendingActions > 0 ? tutor.pendingActions : "-"}</div>
          <button disabled={deleting || tutor.name === "Unassigned"} onClick={() => deleteNames([tutor.name])} aria-label={`Delete ${tutor.name}`} title={tutor.name === "Unassigned" ? "Unassigned is not a tutor" : "Delete tutor"} style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--neutral-200)", background: "#fff", color: tutor.name === "Unassigned" ? "var(--neutral-300)" : "var(--neutral-500)", cursor: tutor.name === "Unassigned" ? "not-allowed" : "pointer" }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {loading && rows.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>Loading…</div>
      )}
      {!loading && rows.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
          No tutor data yet. Upload mapped student data with a tutor column to populate this page.
        </div>
      )}
      </div>
      </div>

      <Pagination page={page} perPage={perPage} total={total} loading={loading} onPageChange={setPage} onPerPageChange={setPerPage} />
    </>
  );
}

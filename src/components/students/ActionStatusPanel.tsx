"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StudentDetail } from "@/lib/students/risk";
import type { ActionStatus } from "@/lib/actions/action-core";

const statusLabels: { status: ActionStatus; label: string }[] = [
  { status: "DONE", label: "Mark done" },
  { status: "STUDENT_SAVED", label: "Student saved" },
  { status: "STUDENT_LOST", label: "Student lost" },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:       { label: "Pending",       color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
  IN_PROGRESS:   { label: "In progress",   color: "#0F766E", bg: "#F0FDFA", border: "#99F6E4" },
  DONE:          { label: "Done",          color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  STUDENT_SAVED: { label: "Student saved", color: "#047857", bg: "#ECFDF5", border: "#A7F3D0" },
  STUDENT_LOST:  { label: "Student lost",  color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
};

export function ActionStatusPanel({ student }: { student: StudentDetail }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const latestAction = student.actions[0] ?? null;
  const currentStatus = latestAction?.status ?? "PENDING";
  const meta = STATUS_META[currentStatus] ?? STATUS_META.PENDING;

  function mark(status: ActionStatus) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(latestAction ? `/api/actions/${latestAction.id}` : "/api/actions", {
        method: latestAction ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latestAction
          ? { status, notes }
          : {
              studentId: student.id,
              type: "RETENTION_OUTREACH",
              content: student.recommendedAction,
              status,
              notes,
            }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not update action");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Action tracking</div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
          padding: "5px 11px", borderRadius: "var(--radius-full)",
          color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color }} />
          {meta.label}
        </span>
      </div>

      {latestAction?.updatedAt && (
        <div style={{ fontSize: 12, color: "var(--neutral-500)", marginBottom: 12 }}>
          Last updated {new Date(latestAction.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Add a quick note"
        rows={3}
        style={{ width: "100%", resize: "vertical", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)", padding: 10, fontFamily: "inherit", fontSize: 13, color: "var(--neutral-800)", marginBottom: 12 }}
      />

      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-400)", marginBottom: 8 }}>
        Update outcome
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {statusLabels.map((item) => {
          const active = currentStatus === item.status;
          const m = STATUS_META[item.status];
          return (
            <button
              key={item.status}
              disabled={isPending}
              onClick={() => mark(item.status)}
              style={{
                fontSize: 13, fontWeight: 600, padding: "8px 13px", borderRadius: "var(--radius-md)",
                cursor: isPending ? "wait" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                border: active ? `1.5px solid ${m.color}` : "1px solid var(--neutral-200)",
                background: active ? m.bg : "#fff",
                color: active ? m.color : "var(--neutral-600)",
                boxShadow: active ? `0 0 0 3px ${m.bg}` : "none",
                transition: "all 150ms",
              }}
            >
              {active && <span style={{ fontSize: 11 }}>✓</span>}
              {item.label}
            </button>
          );
        })}
      </div>
      {error && <div style={{ marginTop: 10, color: "var(--error)", fontSize: 13 }}>{error}</div>}
    </div>
  );
}

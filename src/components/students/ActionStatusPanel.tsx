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

export function ActionStatusPanel({ student }: { student: StudentDetail }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const latestAction = student.actions[0] ?? null;

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
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 10 }}>Action tracking</div>
      <div style={{ fontSize: 13, color: "var(--neutral-600)", lineHeight: 1.5, marginBottom: 12 }}>
        Current status: <strong style={{ color: "var(--neutral-900)" }}>{latestAction?.status ?? "PENDING"}</strong>
      </div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Add a quick note"
        rows={3}
        style={{ width: "100%", resize: "vertical", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)", padding: 10, fontFamily: "inherit", fontSize: 13, color: "var(--neutral-800)", marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {statusLabels.map((item) => (
          <button
            key={item.status}
            disabled={isPending}
            onClick={() => mark(item.status)}
            style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: item.status === "STUDENT_LOST" ? "var(--neutral-100)" : "var(--primary-500)", color: item.status === "STUDENT_LOST" ? "var(--neutral-700)" : "#fff", cursor: isPending ? "wait" : "pointer" }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && <div style={{ marginTop: 10, color: "var(--error)", fontSize: 13 }}>{error}</div>}
    </div>
  );
}

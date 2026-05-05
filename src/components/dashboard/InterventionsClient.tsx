"use client";
import { useState } from "react";
import { Filter, Sparkles, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

export type PendingIntervention = {
  studentId: string;
  name: string;
  initials: string;
  riskBand: string | null;
  recommendedAction: string;
  reasons: string[];
  computedAt: string | null;
};

export type SentAction = {
  id: string;
  type: string;
  content: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  studentId: string;
  studentName: string;
};

function statusLabel(status: string): string {
  switch (status) {
    case "IN_PROGRESS": return "In progress";
    case "DONE": return "Done";
    case "STUDENT_SAVED": return "Student saved";
    case "STUDENT_LOST": return "Student lost";
    default: return status;
  }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toneForBand(band: string | null): "primary" | "accent" | "blue" | "rose" | "slate" {
  if (band === "HIGH") return "rose";
  if (band === "MEDIUM") return "accent";
  return "primary";
}

export default function InterventionsClient({
  initialPending,
  initialSent,
}: {
  initialPending: PendingIntervention[];
  initialSent: SentAction[];
}) {
  const [tab, setTab] = useState<"pending" | "sent" | "snoozed" | "all">("pending");
  const [pending, setPending] = useState(initialPending);
  const [sent, setSent] = useState(initialSent);
  const [selectedSent, setSelectedSent] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(item: PendingIntervention) {
    setLoadingId(item.studentId);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: item.studentId, type: item.recommendedAction, status: "IN_PROGRESS" }),
      });
      if (res.ok) {
        const { action } = await res.json();
        setPending((prev) => prev.filter((p) => p.studentId !== item.studentId));
        setSent((prev) => [
          { id: action.id, type: action.type, content: action.content, status: action.status, notes: action.notes, createdAt: action.createdAt, studentId: item.studentId, studentName: item.name },
          ...prev,
        ]);
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleSnooze(item: PendingIntervention) {
    setLoadingId(item.studentId + "-snooze");
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: item.studentId, type: "SNOOZED", status: "DONE", notes: "Snoozed from interventions" }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.studentId !== item.studentId));
      }
    } finally {
      setLoadingId(null);
    }
  }

  function toggleSent(id: string) {
    setSelectedSent((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSent() {
    setSelectedSent((current) => current.size === sent.length ? new Set() : new Set(sent.map((item) => item.id)));
  }

  async function deleteSent(ids: string[]) {
    if (ids.length === 0) return;
    const label = ids.length === 1 ? "this intervention" : `${ids.length} interventions`;
    if (!window.confirm(`Delete ${label}?`)) return;

    setLoadingId("delete-sent");
    try {
      const res = await fetch("/api/actions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Delete failed");
      const deleted = new Set(ids);
      setSent((prev) => prev.filter((item) => !deleted.has(item.id)));
      setSelectedSent((prev) => new Set([...prev].filter((id) => !deleted.has(id))));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete interventions");
    } finally {
      setLoadingId(null);
    }
  }

  const tabs = [
    { key: "pending" as const, label: `Pending · ${pending.length}` },
    { key: "sent" as const,    label: `Sent · ${sent.length}` },
    { key: "snoozed" as const, label: "Snoozed · 0" },
    { key: "all" as const,     label: "All" },
  ];

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>This week</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Interventions</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} /> Filter
          </button>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={14} /> Draft new
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--neutral-200)", marginBottom: 18 }}>
        {tabs.map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer",
              color: tab === t.key ? "var(--primary-600)" : "var(--neutral-500)",
              borderBottom: tab === t.key ? "2px solid var(--primary-500)" : "2px solid transparent",
            }}
          >{t.label}</div>
        ))}
      </div>

      {(tab === "pending" || tab === "sent") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Pending column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tab === "pending" && pending.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--neutral-400)", fontSize: 14, padding: "40px 0" }}>No pending interventions</div>
            )}
            {tab === "pending" && pending.map((item) => (
              <div key={item.studentId} style={{ background: "var(--primary-50)", border: "1px solid var(--primary-100)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--primary-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13 }}>R</div>
                <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.55 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar initials={item.initials} tone={toneForBand(item.riskBand)} size="sm" />
                    <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }}>{item.name}</strong>
                    <span style={{ color: "var(--neutral-500)" }}>· {item.recommendedAction}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>{item.reasons.join(". ") || `${item.riskBand} risk — intervention suggested`}</div>
                  {item.computedAt && (
                    <span style={{ display: "block", fontSize: 12, color: "var(--neutral-500)", marginTop: 6 }}>Suggested {formatRelative(item.computedAt)}</span>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      disabled={loadingId === item.studentId}
                      onClick={() => handleApprove(item)}
                      style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", opacity: loadingId === item.studentId ? 0.6 : 1 }}
                    >Approve</button>
                    <button
                      style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--neutral-700)", cursor: "pointer" }}
                    >Edit</button>
                    <button
                      disabled={loadingId === item.studentId + "-snooze"}
                      onClick={() => handleSnooze(item)}
                      style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--neutral-700)", cursor: "pointer", opacity: loadingId === item.studentId + "-snooze" ? 0.6 : 1 }}
                    >Snooze</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sent panel */}
          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Sent recently</div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--neutral-500)" }}>
                <input type="checkbox" checked={sent.length > 0 && selectedSent.size === sent.length} onChange={toggleAllSent} aria-label="Select all sent interventions" />
                {selectedSent.size > 0 ? `${selectedSent.size} selected` : `${sent.length} total`}
              </label>
            </div>
            {selectedSent.size > 0 && (
              <button
                disabled={loadingId === "delete-sent"}
                onClick={() => deleteSent([...selectedSent])}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "var(--error)", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loadingId === "delete-sent" ? 0.6 : 1, marginBottom: 10 }}
              >
                <Trash2 size={14} /> Delete selected
              </button>
            )}
            {sent.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--neutral-400)", fontSize: 14, padding: "24px 0" }}>No actions taken yet</div>
            )}
            {sent.map((s, i) => (
              <div key={s.id} style={{ padding: "14px 0", borderBottom: i < sent.length - 1 ? "1px solid var(--neutral-100)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12, color: "var(--neutral-500)" }}>
                  <input type="checkbox" checked={selectedSent.has(s.id)} onChange={() => toggleSent(s.id)} aria-label={`Select intervention for ${s.studentName}`} />
                  <span style={{ background: "var(--primary-50)", color: "var(--primary-700)", padding: "3px 9px", borderRadius: "var(--radius-full)", fontWeight: 600, fontSize: 11 }}>{s.type}</span>
                  <span>{s.studentName}</span>
                  <span style={{ marginLeft: "auto" }}>{formatRelative(s.createdAt)}</span>
                  <button disabled={loadingId === "delete-sent"} onClick={() => deleteSent([s.id])} aria-label={`Delete intervention for ${s.studentName}`} title="Delete intervention" style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-500)", cursor: "pointer" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.5 }}>{s.content ?? s.notes ?? s.type}</div>
                <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6, fontWeight: 500 }}>✓ {statusLabel(s.status)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(tab === "snoozed" || tab === "all") && (
        <div style={{ textAlign: "center", color: "var(--neutral-400)", fontSize: 14, padding: "60px 0" }}>
          {tab === "snoozed" ? "No snoozed interventions" : "All view coming soon"}
        </div>
      )}
    </div>
  );
}

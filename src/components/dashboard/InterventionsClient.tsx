"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Database } from "@/lib/db/database.types";

type ActionStatus = Database["public"]["Enums"]["ActionStatus"];
type TabKey = "pending" | "active" | "completed" | "archive";

const TERMINAL_STATUSES = new Set<ActionStatus>(["DONE", "STUDENT_SAVED", "STUDENT_LOST"]);
const ARCHIVED_TYPE = "ARCHIVED";

const STATUS_OPTIONS: { value: ActionStatus; label: string; tone: "neutral" | "active" | "done" | "saved" | "lost" }[] = [
  { value: "PENDING", label: "Pending", tone: "neutral" },
  { value: "IN_PROGRESS", label: "In progress", tone: "active" },
  { value: "DONE", label: "Done", tone: "done" },
  { value: "STUDENT_SAVED", label: "Student saved", tone: "saved" },
  { value: "STUDENT_LOST", label: "Student lost", tone: "lost" },
];

export type PendingIntervention = {
  studentId: string;
  name: string;
  initials: string;
  riskBand: string | null;
  recommendedAction: string;
  reasons: string[];
  computedAt: string | null;
  contact: string | null;
  subject: string | null;
  attendanceLabel: string;
  lastSessionLabel: string;
  paymentStatus: string | null;
  feeLabel: string;
  confidence: number | null;
};

export type SentAction = {
  id: string;
  type: string;
  content: string | null;
  status: string;
  notes: string | null;
  takenAt: string | null;
  createdAt: string;
  updatedAt: string;
  studentId: string;
  studentName: string;
  contact: string | null;
  subject: string | null;
  attendanceRate: number | null;
  lastSessionDate: string | null;
  paymentStatus: string | null;
  lastPaymentDate: string | null;
};

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function actionTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelative(iso: string | null): string {
  if (!iso) return "No date";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function riskBadgeMeta(band: string | null) {
  if (band === "HIGH") return { label: "High risk", className: "border-red-200 bg-red-50 text-red-800" };
  if (band === "MEDIUM") return { label: "Medium risk", className: "border-amber-200 bg-amber-50 text-amber-800" };
  return { label: band ? actionTypeLabel(band) : "Risk unknown", className: "border-slate-200 bg-slate-50 text-slate-600" };
}

function statusBadgeClass(status: string) {
  const tone = STATUS_OPTIONS.find((item) => item.value === status)?.tone;
  switch (tone) {
    case "active":
      return "border-teal-200 bg-teal-50 text-teal-700";
    case "done":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "saved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "lost":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function Metric({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--neutral-400)]">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-[var(--neutral-800)] [overflow-wrap:anywhere]">{value ?? "Unknown"}</div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--neutral-200)] bg-white px-5 py-11 text-center">
      <CheckCircle2 size={22} className="mx-auto mb-2.5 text-[var(--primary-500)]" />
      <div className="text-[15px] font-bold text-[var(--neutral-900)]">{title}</div>
      <div className="mt-1.5 text-[13px] text-[var(--neutral-500)]">{body}</div>
    </div>
  );
}

export default function InterventionsClient({
  initialPending,
  initialSent,
}: {
  initialPending: PendingIntervention[];
  initialSent: SentAction[];
}) {
  const [tab, setTab] = useState<TabKey>("pending");
  const [pending, setPending] = useState(initialPending);
  const [actions, setActions] = useState(initialSent);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailItem, setDetailItem] = useState<
    { type: "pending"; item: PendingIntervention } | { type: "action"; item: SentAction } | null
  >(null);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const activeActions = useMemo(
    () => actions.filter((action) => action.type !== ARCHIVED_TYPE && !TERMINAL_STATUSES.has(action.status as ActionStatus)),
    [actions]
  );
  const completedActions = useMemo(
    () => actions.filter((action) => action.type !== ARCHIVED_TYPE && TERMINAL_STATUSES.has(action.status as ActionStatus)),
    [actions]
  );
  const archivedActions = useMemo(
    () => actions.filter((action) => action.type === ARCHIVED_TYPE),
    [actions]
  );
  const searchedPending = useMemo(() => {
    if (!normalizedSearch) return pending;
    return pending.filter((item) =>
      [
        item.name,
        item.riskBand,
        item.recommendedAction,
        item.subject,
        item.contact,
        item.paymentStatus,
        item.reasons.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch, pending]);
  const displayedActions = tab === "active" ? activeActions : tab === "completed" ? completedActions : archivedActions;
  const searchedActions = useMemo(() => {
    if (!normalizedSearch) return displayedActions;
    return displayedActions.filter((action) =>
      [
        action.studentName,
        action.type,
        statusLabel(action.status),
        action.content,
        action.notes,
        action.subject,
        action.contact,
        action.paymentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [displayedActions, normalizedSearch]);

  async function handleStart(item: PendingIntervention, status: ActionStatus = "IN_PROGRESS") {
    setLoadingId(item.studentId);
    setErrorMsg("");
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: item.studentId,
          type: item.recommendedAction,
          content: item.recommendedAction,
          status,
          notes: item.reasons.join(". "),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not create intervention");
      const action = data.action;
      setPending((prev) => prev.filter((p) => p.studentId !== item.studentId));
      setActions((prev) => [
        {
          id: action.id,
          type: action.type,
          content: action.content,
          status: action.status,
          notes: action.notes,
          takenAt: action.takenAt,
          createdAt: action.createdAt,
          updatedAt: action.updatedAt,
          studentId: item.studentId,
          studentName: item.name,
          contact: item.contact,
          subject: item.subject,
          attendanceRate: item.attendanceLabel === "Unknown" ? null : Number.parseFloat(item.attendanceLabel),
          lastSessionDate: null,
          paymentStatus: item.paymentStatus,
          lastPaymentDate: null,
        },
        ...prev,
      ]);
      setTab(status === "IN_PROGRESS" ? "active" : "completed");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not create intervention");
    } finally {
      setLoadingId(null);
    }
  }

  async function archivePending(item: PendingIntervention) {
    setLoadingId(item.studentId);
    setErrorMsg("");
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: item.studentId,
          type: ARCHIVED_TYPE,
          content: "Archived intervention suggestion",
          status: "DONE",
          notes: item.reasons.join(". ") || "Archived from interventions",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not archive intervention");
      const action = data.action;
      setPending((prev) => prev.filter((p) => p.studentId !== item.studentId));
      setActions((prev) => [
        {
          id: action.id,
          type: action.type,
          content: action.content,
          status: action.status,
          notes: action.notes,
          takenAt: action.takenAt,
          createdAt: action.createdAt,
          updatedAt: action.updatedAt,
          studentId: item.studentId,
          studentName: item.name,
          contact: item.contact,
          subject: item.subject,
          attendanceRate: item.attendanceLabel === "Unknown" ? null : Number.parseFloat(item.attendanceLabel),
          lastSessionDate: null,
          paymentStatus: item.paymentStatus,
          lastPaymentDate: null,
        },
        ...prev,
      ]);
      setTab("archive");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not archive intervention");
    } finally {
      setLoadingId(null);
    }
  }

  async function archiveAction(action: SentAction) {
    setLoadingId(action.id);
    setErrorMsg("");
    const previous = actions;
    const updatedAt = new Date().toISOString();
    setActions((prev) => prev.map((item) => item.id === action.id ? { ...item, type: ARCHIVED_TYPE, status: "DONE", updatedAt, takenAt: updatedAt } : item));

    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DONE",
          type: ARCHIVED_TYPE,
          notes: action.notes ?? "Archived from interventions",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not archive intervention");
      setActions((prev) => prev.map((item) => item.id === action.id ? { ...item, ...data.action } : item));
      setTab("archive");
    } catch (error) {
      setActions(previous);
      setErrorMsg(error instanceof Error ? error.message : "Could not archive intervention");
    } finally {
      setLoadingId(null);
    }
  }

  async function updateStatus(action: SentAction, status: ActionStatus) {
    setLoadingId(action.id);
    setErrorMsg("");
    const previous = actions;
    const updatedAt = new Date().toISOString();
    setActions((prev) => prev.map((item) => item.id === action.id ? { ...item, status, updatedAt, takenAt: TERMINAL_STATUSES.has(status) ? updatedAt : item.takenAt } : item));

    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: action.notes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not update status");
      setActions((prev) => prev.map((item) => item.id === action.id ? { ...item, ...data.action } : item));
    } catch (error) {
      setActions(previous);
      setErrorMsg(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteAction(action: SentAction) {
    if (!window.confirm(`Delete intervention for ${action.studentName}?`)) return;
    setLoadingId(action.id);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/actions/${action.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not delete intervention");
      setActions((prev) => prev.filter((item) => item.id !== action.id));
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not delete intervention");
    } finally {
      setLoadingId(null);
    }
  }

  const tabs = [
    { key: "pending" as const, label: "Pending", count: pending.length },
    { key: "active" as const, label: "Active", count: activeActions.length },
    { key: "completed" as const, label: "Completed", count: completedActions.length },
    { key: "archive" as const, label: "Archive", count: archivedActions.length },
  ];

  return (
    <div className="page-fade">
      <div className="mb-6 flex items-end justify-between w-full gap-6">
        <div>
          <div className="text-sm text-[var(--neutral-500)]">Retention work queue</div>
          <h1 className="m-0 mt-1 font-[family:var(--font-display)] text-[32px] font-medium tracking-[-0.02em] text-[var(--neutral-900)]">Interventions</h1>
        </div>
        <div className="flex shrink-0 gap-3">
          <SummaryTile label="Pending" value={pending.length} />
          <SummaryTile label="Active" value={activeActions.length} />
          <SummaryTile label="Completed" value={completedActions.length} />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800">
          <AlertTriangle size={14} />
          {errorMsg}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-100)] pb-4">
          <div className="flex gap-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`rounded-sm border-0 px-3 py-2 text-sm font-semibold ${
                  tab === item.key
                    ? "bg-[var(--primary-50)] text-[var(--primary-700)]"
                    : "bg-transparent text-[var(--neutral-500)] hover:bg-[var(--neutral-50)]"
                }`}
              >
                {item.label} <span className={tab === item.key ? "text-[var(--primary-600)]" : "text-[var(--neutral-400)]"}>{item.count}</span>
              </button>
            ))}
          </div>

          <div className="flex w-[360px] items-center gap-2.5 rounded-sm border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2">
            <Search size={15} className="text-[var(--neutral-400)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search interventions"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="inline-flex border-0 bg-transparent p-0.5 text-[var(--neutral-400)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div>
          {tab === "pending" && (
            <section>
              {searchedPending.length === 0 ? (
                <EmptyState
                  title={searchQuery ? "No matching interventions" : "No pending interventions"}
                  body={searchQuery ? "Try a student name, status, subject, or action type." : "Students with open risk signals will appear here after scoring."}
                />
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {searchedPending.map((item) => (
                    <PendingCard
                      key={item.studentId}
                      item={item}
                      loadingId={loadingId}
                      onStart={() => handleStart(item)}
                      onArchive={() => archivePending(item)}
                      onView={() => setDetailItem({ type: "pending", item })}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab !== "pending" && (
            <section>
              {searchedActions.length === 0 ? (
                <EmptyState
                  title={searchQuery ? "No matching interventions" : tab === "archive" ? "No archived interventions" : tab === "completed" ? "No completed interventions" : "No active interventions"}
                  body={searchQuery ? "Try a student name, status, subject, or action type." : tab === "archive" ? "Archive suggestions or old interventions to keep the queue clean." : tab === "completed" ? "Mark active work as done, saved, or lost to keep outcomes visible." : "Start a pending suggestion to create an active intervention."}
                />
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {searchedActions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      disabled={loadingId === action.id}
                      onStatusChange={(status) => updateStatus(action, status)}
                      onDelete={() => deleteAction(action)}
                      onArchive={() => archiveAction(action)}
                      onView={() => setDetailItem({ type: "action", item: action })}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {detailItem && <InterventionDetailsModal detail={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-[116px] rounded-sm border border-[var(--neutral-200)] bg-white px-3.5 py-3 shadow-[var(--shadow-xs)]">
      <div className="text-xs font-semibold text-[var(--neutral-500)]">{label}</div>
      <div className="mt-1 font-[family:var(--font-display)] text-2xl font-medium leading-none tracking-[-0.02em] text-[var(--neutral-900)] tabular-nums">{value}</div>
    </div>
  );
}

function PendingCard({
  item,
  loadingId,
  onStart,
  onArchive,
  onView,
}: {
  item: PendingIntervention;
  loadingId: string | null;
  onStart: () => void;
  onArchive: () => void;
  onView: () => void;
}) {
  const risk = riskBadgeMeta(item.riskBand);

  return (
    <article className="relative flex min-w-[320px] basis-[calc(33.333%_-_10px)] grow-0 flex-wrap items-center gap-4 rounded-sm border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <div className="w-full">
        <div className="w-full text-lg font-bold tracking-[-0.01em] text-[var(--neutral-900)]">{item.name}</div>
        <div className="mt-0.5 w-full text-xs text-[var(--neutral-400)]">
          {item.computedAt ? formatRelative(item.computedAt) : "Not dated"}
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-1 gap-1 text-[13px] leading-[1.45] text-[var(--neutral-700)]">
        <span className="w-full shrink-0 text-sm text-[var(--neutral-900)]">
          <strong>Reason:</strong>&nbsp;
          {item.reasons[0] ?? "Risk score suggests a guardian or student check-in."}
        </span>
      </div>

      <div className="flex shrink-0 w-full justify-between items-center gap-3">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${risk.className}`}>
          {risk.label}
        </span>
        <button
          disabled={loadingId === item.studentId}
          onClick={onStart}
          className="rounded-sm border-0 bg-[var(--primary-500)] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          Start intervention
        </button>
        <div className="flex gap-1.5 absolute top-4 right-4 z-10">
          <IconButton label={`View details for ${item.name}`} onClick={onView} icon={<Eye size={15} />} />
          <IconButton label={`Archive intervention for ${item.name}`} onClick={onArchive} icon={<Archive size={15} />} disabled={loadingId === item.studentId} />
        </div>
      </div>
    </article>
  );
}

function ActionCard({
  action,
  disabled,
  onStatusChange,
  onDelete,
  onArchive,
  onView,
}: {
  action: SentAction;
  disabled: boolean;
  onStatusChange: (status: ActionStatus) => void;
  onDelete: () => void;
  onArchive: () => void;
  onView: () => void;
}) {
  const statusClass = statusBadgeClass(action.status);

  return (
    <article className="relative flex min-w-[320px] basis-[calc(33.333%_-_10px)] grow-0 flex-wrap items-center gap-4 rounded-sm border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <div className="w-full">
        <div className="w-full text-lg font-bold tracking-[-0.01em] text-[var(--neutral-900)]">{action.studentName}</div>
        <div className="mt-0.5 inline-flex w-full items-center gap-1 text-xs text-[var(--neutral-400)]">
          <Clock3 size={12} />
          {formatRelative(action.createdAt)}
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-1 gap-1 text-[13px] leading-[1.45] text-[var(--neutral-700)]">
        <span className="w-full shrink-0 text-sm text-[var(--neutral-900)]">
          <strong>Action:</strong>&nbsp;
          {action.content ?? action.notes ?? actionTypeLabel(action.type)}
        </span>
      </div>

      <div className="flex shrink-0 w-full justify-between items-center gap-3">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass}`}>
          {statusLabel(action.status)}
        </span>
        <select
          disabled={disabled}
          value={action.status}
          onChange={(event) => onStatusChange(event.target.value as ActionStatus)}
          className="h-[34px] rounded-sm border border-[var(--neutral-200)] bg-white px-2.5 text-[13px] font-semibold text-[var(--neutral-800)] disabled:cursor-not-allowed"
          aria-label={`Status for ${action.studentName}`}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="flex gap-1.5 absolute top-4 right-4 z-10">
          <IconButton label={`View details for ${action.studentName}`} onClick={onView} icon={<Eye size={15} />} />
          {action.type !== ARCHIVED_TYPE && (
            <IconButton label={`Archive intervention for ${action.studentName}`} onClick={onArchive} icon={<Archive size={15} />} disabled={disabled} />
          )}
          <IconButton label={`Delete intervention for ${action.studentName}`} onClick={onDelete} icon={<Trash2 size={14} />} disabled={disabled} />
        </div>
      </div>
    </article>
  );
}

function InterventionDetailsModal({
  detail,
  onClose,
}: {
  detail: { type: "pending"; item: PendingIntervention } | { type: "action"; item: SentAction };
  onClose: () => void;
}) {
  const isPending = detail.type === "pending";
  const title = isPending ? detail.item.name : detail.item.studentName;
  const subtitle = isPending ? detail.item.recommendedAction : actionTypeLabel(detail.item.type);
  const risk = isPending ? riskBadgeMeta(detail.item.riskBand) : null;
  const statusClass = !isPending ? statusBadgeClass(detail.item.status) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Intervention details for ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-[min(720px,100%)] overflow-y-auto rounded-sm border border-[var(--neutral-200)] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--neutral-100)] px-[22px] pb-4 pt-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-xl font-bold text-[var(--neutral-900)]">{title}</h2>
              {risk && (
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${risk.className}`}>
                  {risk.label}
                </span>
              )}
              {!isPending && statusClass && (
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass}`}>
                  {statusLabel(detail.item.status)}
                </span>
              )}
            </div>
            <div className="mt-1.5 text-sm text-[var(--neutral-500)]">{subtitle}</div>
          </div>
          <IconButton label="Close details" onClick={onClose} icon={<X size={15} />} />
        </div>

        <div className="p-[22px]">
          {isPending ? (
            <>
              <DetailSection title="Why this is suggested">
                <p className="m-0 text-sm leading-[1.6] text-[var(--neutral-700)]">
                  {detail.item.reasons.length > 0 ? detail.item.reasons.join(". ") : "Risk score suggests a guardian or student check-in."}
                </p>
              </DetailSection>
              <DetailGrid>
                <Metric label="Subject" value={detail.item.subject} />
                <Metric label="Contact" value={detail.item.contact} />
                <Metric label="Attendance" value={detail.item.attendanceLabel} />
                <Metric label="Last session" value={detail.item.lastSessionLabel} />
                <Metric label="Payment" value={detail.item.paymentStatus ?? detail.item.feeLabel} />
                <Metric label="Confidence" value={detail.item.confidence === null ? "Unknown" : `${Math.round(detail.item.confidence * 100)}%`} />
                <Metric label="Suggested" value={detail.item.computedAt ? formatRelative(detail.item.computedAt) : "Not dated"} />
                <Metric label="Recommended action" value={detail.item.recommendedAction} />
              </DetailGrid>
            </>
          ) : (
            <>
              <DetailSection title="Intervention">
                <p className="m-0 text-sm leading-[1.6] text-[var(--neutral-700)]">
                  {detail.item.content ?? actionTypeLabel(detail.item.type)}
                </p>
                {detail.item.notes && detail.item.notes !== detail.item.content && (
                  <p className="m-0 mt-2.5 text-[13px] leading-[1.55] text-[var(--neutral-500)]">{detail.item.notes}</p>
                )}
              </DetailSection>
              <DetailGrid>
                <Metric label="Subject" value={detail.item.subject} />
                <Metric label="Contact" value={detail.item.contact} />
                <Metric label="Attendance" value={detail.item.attendanceRate === null ? "Unknown" : `${detail.item.attendanceRate}%`} />
                <Metric label="Last session" value={formatDate(detail.item.lastSessionDate)} />
                <Metric label="Payment" value={detail.item.paymentStatus ?? formatDate(detail.item.lastPaymentDate)} />
                <Metric label="Created" value={formatRelative(detail.item.createdAt)} />
                <Metric label="Updated" value={formatRelative(detail.item.updatedAt)} />
                <Metric label="Closed" value={detail.item.takenAt ? formatRelative(detail.item.takenAt) : "Open"} />
              </DetailGrid>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[18px]">
      <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.05em] text-[var(--neutral-500)]">{title}</div>
      <div className="rounded-sm border border-[var(--neutral-200)] bg-slate-50 px-3.5 py-3">{children}</div>
    </section>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-4 gap-3.5">
      {children}
    </div>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--neutral-200)] bg-white text-[var(--neutral-500)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
    </button>
  );
}

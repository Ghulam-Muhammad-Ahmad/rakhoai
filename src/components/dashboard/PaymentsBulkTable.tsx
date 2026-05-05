"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { formatCurrencyAmount, formatDateLabel, formatPaymentStatus, statusColors } from "@/lib/imports/table-format";

export type PaymentTableRow = {
  id: string;
  paymentDate: string | null;
  amount: string | number | null;
  paymentStatus: string | null;
  overdueAmount: string | number | null;
  method: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    externalId: string | null;
  } | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function StatusBadge({ value }: { value: string | null }) {
  const status = formatPaymentStatus(value);
  const colors = statusColors(status.tone);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 99, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontSize: 12, fontWeight: 600 }}>
      {status.label}
    </span>
  );
}

export function PaymentsBulkTable({ rows: initialRows, currencySymbol }: { rows: PaymentTableRow[]; currencySymbol: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
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
    const label = ids.length === 1 ? "this payment" : `${ids.length} payments`;
    if (!window.confirm(`Delete ${label}?`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Delete failed");
      const deleted = new Set(ids);
      setRows((current) => current.filter((row) => !deleted.has(row.id)));
      setSelected((current) => new Set([...current].filter((id) => !deleted.has(id))));
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete payments");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--neutral-100)", background: selected.size > 0 ? "var(--primary-50)" : "#fff" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--neutral-600)" }}>
          <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} aria-label="Select all payments" />
          {selected.size > 0 ? `${selected.size} selected` : `${rows.length} payment${rows.length !== 1 ? "s" : ""}`}
        </label>
        <button disabled={deleting || selectedIds.length === 0} onClick={() => deleteIds(selectedIds)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 8, border: "1px solid #FECACA", background: selectedIds.length ? "#FEF2F2" : "var(--neutral-50)", color: selectedIds.length ? "var(--error)" : "var(--neutral-400)", fontSize: 13, fontWeight: 600, cursor: selectedIds.length ? "pointer" : "not-allowed", opacity: deleting ? 0.6 : 1 }}>
          <Trash2 size={14} /> Delete selected
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "32px 1.6fr 1fr 0.9fr 1fr 1fr 0.8fr 44px", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
        <div /><div>Student</div><div>Date</div><div>Amount</div><div>Status</div><div>Overdue</div><div>Method</div><div />
      </div>

      {rows.map((row) => {
        const name = row.student?.name ?? "Unlinked student";
        return (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "32px 1.6fr 1fr 0.9fr 1fr 1fr 0.8fr 44px", padding: "12px 20px", alignItems: "center", borderBottom: "1px solid var(--neutral-100)", gap: 12, fontSize: 14 }}>
            <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label={`Select payment for ${name}`} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Avatar initials={initials(name)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{row.student?.externalId ?? row.student?.id ?? "No identifier"}</div>
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)" }}>{formatDateLabel(row.paymentDate)}</div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-800)" }}>{formatCurrencyAmount(row.amount, currencySymbol)}</div>
            <div><StatusBadge value={row.paymentStatus} /></div>
            <div style={{ fontFamily: "var(--font-mono)", color: Number(row.overdueAmount ?? 0) > 0 ? "var(--error)" : "var(--neutral-500)" }}>{formatCurrencyAmount(row.overdueAmount, currencySymbol)}</div>
            <div style={{ color: row.method ? "var(--neutral-700)" : "var(--neutral-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.method ?? "Not set"}</div>
            <button disabled={deleting} onClick={() => deleteIds([row.id])} aria-label={`Delete payment for ${name}`} title="Delete payment" style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-500)", cursor: "pointer" }}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
          No payments found. Import a payments file to unlock fee-risk accuracy.
        </div>
      )}
    </>
  );
}

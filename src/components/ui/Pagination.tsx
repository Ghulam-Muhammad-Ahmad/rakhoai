"use client";

import { PER_PAGE_OPTIONS } from "@/lib/pagination";

type PaginationProps = {
  page: number; // 1-based
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  loading?: boolean;
};

export function Pagination({ page, perPage, total, onPageChange, onPerPageChange, loading }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid var(--neutral-200)",
    background: disabled ? "var(--neutral-50)" : "#fff",
    color: disabled ? "var(--neutral-400)" : "var(--neutral-700)",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 20px", borderTop: "1px solid var(--neutral-100)", fontSize: 13, color: "var(--neutral-600)" }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        Rows per page
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid var(--neutral-200)", fontSize: 13, background: "#fff", color: "var(--neutral-700)" }}
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{from}–{to} of {total}</span>
        <button style={btn(loading || page <= 1)} disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
        <button style={btn(loading || page >= lastPage)} disabled={loading || page >= lastPage} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

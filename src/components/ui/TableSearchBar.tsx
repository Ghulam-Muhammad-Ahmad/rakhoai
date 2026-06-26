"use client";

import { Search } from "lucide-react";

export type StatusOption = { value: string; label: string };

/** Client-side search + status filter row. Updates state instantly (no page
 *  navigation); the table debounces the fetch. */
export function TableSearchBar({
  q,
  onQ,
  status,
  onStatus,
  statusOptions,
  placeholder,
}: {
  q: string;
  onQ: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  statusOptions: StatusOption[];
  placeholder: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, padding: 16, borderBottom: "1px solid var(--neutral-100)", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 240, padding: "0 12px", borderRadius: 8, border: "1px solid var(--neutral-200)" }}>
        <Search size={14} color="var(--neutral-400)" />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, border: "none", background: "transparent", outline: "none", padding: "9px 0", fontFamily: "inherit", fontSize: 13, color: "var(--neutral-800)" }}
        />
      </div>
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        style={{ width: 170, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--neutral-200)", fontSize: 13, background: "#fff", color: "var(--neutral-700)" }}
      >
        <option value="">All statuses</option>
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

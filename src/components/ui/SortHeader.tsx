"use client";

/** Clickable column header that toggles sort on the given `col` key.
 *  Renders an asc/desc caret when active. */
export function SortHeader({
  label,
  col,
  sort,
  direction,
  onSort,
}: {
  label: string;
  col: string;
  sort: string;
  direction: "asc" | "desc";
  onSort: (col: string) => void;
}) {
  const active = sort === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 0,
        border: "none",
        background: "none",
        font: "inherit",
        textTransform: "inherit",
        letterSpacing: "inherit",
        color: active ? "var(--neutral-800)" : "inherit",
        fontWeight: active ? 700 : "inherit",
        cursor: "pointer",
      }}
    >
      {label}
      <span style={{ opacity: active ? 1 : 0.25, fontSize: 9 }}>{active && direction === "asc" ? "▲" : "▼"}</span>
    </button>
  );
}

import type { RiskLevel } from "@/lib/data";

const map: Record<RiskLevel, { bg: string; fg: string; dot: string; label: string }> = {
  critical: { bg: "#FEE2E2", fg: "#B91C1C", dot: "#B91C1C", label: "Critical" },
  high:     { bg: "#FEE2E2", fg: "#DC2626", dot: "#DC2626", label: "High"     },
  medium:   { bg: "#FEF3C7", fg: "#B45309", dot: "#F59E0B", label: "Medium"   },
  low:      { bg: "#FEF9C3", fg: "#854D0E", dot: "#FCD34D", label: "Low"      },
  safe:     { bg: "#D1FAE5", fg: "#047857", dot: "#10B981", label: "Safe"     },
};

export default function RiskBadge({ level }: { level: RiskLevel }) {
  const m = map[level];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: "var(--radius-full)",
      fontSize: 11, fontWeight: 600, background: m.bg, color: m.fg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

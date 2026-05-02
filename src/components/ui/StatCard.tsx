export default function StatCard({
  eyebrow, value, sub, delta, deltaTone = "up", tinted = false,
}: {
  eyebrow: string; value: string; sub: string;
  delta?: string; deltaTone?: "up" | "down" | "warn"; tinted?: boolean;
}) {
  const deltaStyle: Record<string, { background: string; color: string }> = {
    up:   { background: "#ECFDF5", color: "#047857" },
    down: { background: "#FEF2F2", color: "#B91C1C" },
    warn: { background: "#FFFBEB", color: "#B45309" },
  };
  return (
    <div style={{
      background: tinted ? "var(--primary-50)" : "#fff",
      border: `1px solid ${tinted ? "var(--primary-100)" : "var(--neutral-200)"}`,
      borderRadius: "var(--radius-lg)", padding: 20,
      boxShadow: "var(--shadow-xs)",
    }}>
      <div style={{ fontSize: 12, color: "var(--neutral-500)", fontWeight: 500 }}>{eyebrow}</div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 36,
        lineHeight: 1, letterSpacing: "-0.02em", color: "var(--neutral-900)",
        fontVariantNumeric: "tabular-nums", marginTop: 6,
      }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>{sub}</span>
        {delta && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px",
            borderRadius: "var(--radius-full)", fontVariantNumeric: "tabular-nums",
            ...deltaStyle[deltaTone],
          }}>{delta}</span>
        )}
      </div>
    </div>
  );
}

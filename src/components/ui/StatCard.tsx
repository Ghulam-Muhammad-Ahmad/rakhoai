"use client";
import { useState } from "react";

export default function StatCard({
  eyebrow, value, sub, delta, deltaTone = "up", tinted = false,
}: {
  eyebrow: string; value: string; sub: string;
  delta?: string; deltaTone?: "up" | "down" | "warn"; tinted?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const deltaStyle: Record<string, { background: string; color: string }> = {
    up:   { background: "#ECFDF5", color: "#047857" },
    down: { background: "#FEF2F2", color: "#B91C1C" },
    warn: { background: "#FFFBEB", color: "#B45309" },
  };
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: tinted ? "var(--primary-50)" : "#fff",
        border: `1px solid ${hover ? "var(--primary-300)" : tinted ? "var(--primary-100)" : "var(--neutral-200)"}`,
        borderRadius: "var(--radius-lg)", padding: 20,
        boxShadow: hover ? "0 10px 28px -8px rgba(15,118,110,0.22)" : "var(--shadow-xs)",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        cursor: "default",
      }}>
      <div style={{ fontSize: 12, color: "var(--neutral-500)", fontWeight: 500 }}>{eyebrow}</div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 36,
        lineHeight: 1, letterSpacing: "-0.02em",
        color: hover ? "var(--primary-600)" : "var(--neutral-900)",
        fontVariantNumeric: "tabular-nums", marginTop: 6,
        transition: "color 180ms ease",
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

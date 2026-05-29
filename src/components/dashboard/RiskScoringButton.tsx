"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

type Props = {
  unscoredCount: number;
  dataOutdated: boolean;
};

export function RiskScoringButton({ unscoredCount, dataOutdated }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runScoring() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/scoring/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Risk scoring failed.");
        return;
      }
      router.refresh();
    });
  }

  const reason = dataOutdated
    ? "New import data is available. Refresh risk scores so the dashboard uses the latest sessions and payments."
    : `${unscoredCount.toLocaleString()} student${unscoredCount === 1 ? " has" : "s have"} not been scored yet.`;

  return (
    <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 8, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#78350F", fontSize: 13, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 260, flex: 1 }}>
        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Risk scores need an update.</strong> {reason}
        </span>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={runScoring}
        style={{
          border: "none",
          background: "transparent",
          color: "#0F766E",
          fontSize: 13,
          fontWeight: 800,
          cursor: isPending ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 0",
        }}
      >
        {isPending ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : <Sparkles size={14} />}
        {isPending ? "Scoring..." : "Run scoring"}
      </button>
      {error && <div style={{ flexBasis: "100%", color: "#DC2626", paddingLeft: 26 }}>{error}</div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

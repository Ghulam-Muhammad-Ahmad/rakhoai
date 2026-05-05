"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";

type ScoringSummary = {
  studentsScored: number;
  sessionsUsed: number;
  paymentsUsed: number;
  riskCounts: { high: number; medium: number; low: number };
  confidenceCounts: { high: number; medium: number; low: number };
  scoredAt: string;
  warnings?: string[];
};

export function RiskScoringButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScoringSummary | null>(null);

  function runScoring() {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const res = await fetch("/api/scoring/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Risk scoring failed.");
        return;
      }
      setSummary(data as ScoringSummary);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={runScoring}
        style={{
          fontSize: 14,
          fontWeight: 600,
          padding: "9px 14px",
          borderRadius: "var(--radius-md)",
          border: "none",
          background: disabled || isPending ? "var(--neutral-300)" : "var(--primary-500)",
          color: "#fff",
          cursor: disabled || isPending ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {isPending ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : <Sparkles size={14} />}
        {isPending ? "Scoring…" : "Run risk scoring"}
      </button>
      {error && <div style={{ fontSize: 12, color: "#DC2626", maxWidth: 300, textAlign: "right" }}>{error}</div>}
      {summary && (
        <div style={{ maxWidth: 360, textAlign: "right", padding: "10px 12px", borderRadius: 8, border: "1px solid #CCFBF1", background: "#F0FDFA", color: "#0F766E", fontSize: 12, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Scoring complete</div>
          <div>
            Students scored: {summary.studentsScored.toLocaleString()} · Sessions used: {summary.sessionsUsed.toLocaleString()} · Payments used: {summary.paymentsUsed.toLocaleString()}
          </div>
          <div>
            High risk: {summary.riskCounts.high} · Medium risk: {summary.riskCounts.medium} · Low risk: {summary.riskCounts.low}
          </div>
          <div>
            Confidence: {summary.confidenceCounts.high} high · {summary.confidenceCounts.medium} medium · {summary.confidenceCounts.low} low
          </div>
          {summary.warnings?.map((warning) => (
            <div key={warning} style={{ color: "#92400E", marginTop: 2 }}>{warning}</div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

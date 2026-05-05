"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import type { NormalizationSummary } from "@/lib/scoring/normalizers";
import type { EntityType, ImportReviewSummary } from "@/lib/imports/types";
import { UploadStepper } from "@/components/upload/UploadStepper";

type PreviewState = "loading" | "ready" | "error" | "processing";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  percentage: "percentage (%)",
  ratio: "decimal ratio (0–1)",
  fraction: "fraction (e.g. 18/25)",
  boolean_text: "present/absent text",
  ai_inferred: "AI inferred",
  rule_match: "keyword match",
  number: "number",
  k_suffix: "k-suffix (e.g. 12k)",
  approximate: "approximate value",
  excel_serial: "Excel date serial",
  iso: "standard date",
  dmy: "DD/MM/YYYY date",
  relative_date: "relative date (not supported)",
  null_marker: "explicit null (N/A)",
  empty: "empty",
  unknown: "unrecognized",
  ai_unknown: "AI could not determine",
  ai_error: "AI error",
  out_of_range: "out of range",
};

function confidenceBadge(confidence: number) {
  if (confidence >= 0.9) return { color: "#10B981", bg: "#D1FAE5", label: "High" };
  if (confidence >= 0.7) return { color: "#D97706", bg: "#FEF3C7", label: "Medium" };
  if (confidence > 0) return { color: "#DC2626", bg: "#FEE2E2", label: "Low" };
  return { color: "#6B7280", bg: "#F3F4F6", label: "Unknown" };
}

function SummaryCard({ summary }: { summary: NormalizationSummary }) {
  const hasLowConf = summary.lowConfidenceCount > 0;
  const hasUnknown = summary.unknownCount > 0;
  const topGroups = summary.groups.slice(0, 8);

  return (
    <div style={{ border: "1px solid var(--neutral-200)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--neutral-100)", background: "var(--neutral-50)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--neutral-900)" }}>{summary.label}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {hasLowConf && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#D97706", background: "#FEF3C7", padding: "2px 8px", borderRadius: 99 }}>
              <AlertTriangle size={11} /> {summary.lowConfidenceCount} low confidence
            </span>
          )}
          {hasUnknown && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#DC2626", background: "#FEE2E2", padding: "2px 8px", borderRadius: 99 }}>
              <AlertTriangle size={11} /> {summary.unknownCount} unrecognized
            </span>
          )}
          {!hasLowConf && !hasUnknown && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#10B981", background: "#D1FAE5", padding: "2px 8px", borderRadius: 99 }}>
              <CheckCircle size={11} /> All recognized
            </span>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--neutral-50)" }}>
              <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: "var(--neutral-500)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--neutral-100)" }}>Raw value</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: "var(--neutral-500)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--neutral-100)" }}>Converted to</th>
              <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: "var(--neutral-500)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--neutral-100)" }}>Detected as</th>
              <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, color: "var(--neutral-500)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--neutral-100)" }}>Confidence</th>
              <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, color: "var(--neutral-500)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--neutral-100)" }}>Rows</th>
            </tr>
          </thead>
          <tbody>
            {topGroups.map((g, i) => {
              const badge = confidenceBadge(g.confidence);
              return (
                <tr key={i} style={{ borderBottom: i < topGroups.length - 1 ? "1px solid var(--neutral-100)" : "none" }}>
                  <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "var(--neutral-700)" }}>
                    {g.raw || <span style={{ color: "var(--neutral-400)", fontStyle: "italic" }}>empty</span>}
                  </td>
                  <td style={{ padding: "9px 14px", fontWeight: 500, color: g.normalized != null ? "var(--neutral-900)" : "var(--neutral-400)" }}>
                    {g.normalized != null ? String(g.normalized) : <span style={{ fontStyle: "italic" }}>null (skipped)</span>}
                  </td>
                  <td style={{ padding: "9px 14px", color: "var(--neutral-500)", fontSize: 12 }}>
                    {SOURCE_TYPE_LABELS[g.sourceType] ?? g.sourceType}
                  </td>
                  <td style={{ padding: "9px 14px", textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg, padding: "2px 7px", borderRadius: 99 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: "9px 14px", textAlign: "right", color: "var(--neutral-600)", fontWeight: 500 }}>
                    {g.count}
                  </td>
                </tr>
              );
            })}
            {summary.groups.length > 8 && (
              <tr>
                <td colSpan={5} style={{ padding: "8px 14px", fontSize: 12, color: "var(--neutral-400)", fontStyle: "italic" }}>
                  +{summary.groups.length - 8} more unique values…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function entityNoun(entityType: EntityType, count: number) {
  const singular = entityType === "students" ? "student" : entityType === "sessions" ? "session row" : entityType === "payments" ? "payment row" : "teacher row";
  return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}

function ReviewMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "good" | "warn" }) {
  const color = tone === "good" ? "#0F766E" : tone === "warn" ? "#B45309" : "var(--neutral-900)";
  const bg = tone === "good" ? "#F0FDFA" : tone === "warn" ? "#FFFBEB" : "#fff";
  return (
    <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--neutral-200)", background: bg }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>{value.toLocaleString()}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--neutral-500)", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ImportReviewPanel({ entityType, review }: { entityType: EntityType; review: ImportReviewSummary }) {
  if (entityType === "students") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginBottom: 20 }}>
        <ReviewMetric label="Rows found" value={review.totalRows} />
        <ReviewMetric label="New students" value={review.newRows} tone="good" />
        <ReviewMetric label="Updated students" value={review.updatedRows} />
        <ReviewMetric label="Missing names" value={review.missingNames ?? 0} tone={(review.missingNames ?? 0) > 0 ? "warn" : "neutral"} />
        <ReviewMetric label="Missing identifiers" value={review.missingIdentifiers ?? 0} tone={(review.missingIdentifiers ?? 0) > 0 ? "warn" : "neutral"} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginBottom: 20 }}>
      <ReviewMetric label="Rows found" value={review.totalRows} />
      <ReviewMetric label={entityType === "sessions" ? "Matched to students" : entityType === "payments" ? "Matched to students" : "Ready to import"} value={review.readyRows} tone="good" />
      <ReviewMetric label="Unmatched rows" value={review.unmatchedRows} tone={review.unmatchedRows > 0 ? "warn" : "neutral"} />
      <ReviewMetric label="Low-confidence matches" value={review.lowConfidenceRows} tone={review.lowConfidenceRows > 0 ? "warn" : "neutral"} />
      <ReviewMetric label="Ignored rows" value={review.ignoredRows ?? 0} />
    </div>
  );
}

export default function NormalizePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const uploadId = params.id;

  const [state, setState] = useState<Exclude<PreviewState, "processing">>("loading");
  const [summaries, setSummaries] = useState<NormalizationSummary[]>([]);
  const [entityType, setEntityType] = useState<EntityType>("students");
  const [review, setReview] = useState<ImportReviewSummary | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/uploads/${uploadId}/normalize-preview`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error ?? "Failed to load preview");
          setState("error");
          return;
        }
        setEntityType(data.entityType ?? "students");
        setReview(data.review ?? null);
        setSummaries(data.summaries ?? []);
        setRowCount(data.rowCount ?? 0);
        setState("ready");
      } catch {
        setErrorMsg("Network error loading preview");
        setState("error");
      }
    })();
  }, [uploadId]);


  return (
    <div className="page-fade" style={{ maxWidth: 900, margin: "0 auto" }}>
      <UploadStepper currentStep="normalize" />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: 0 }}>
          Review import
        </h1>
        <p style={{ fontSize: 14, color: "var(--neutral-500)", marginTop: 6 }}>
          Review what Rakho will import before any records are saved.
        </p>
      </div>

      {state === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "40px 0", color: "var(--neutral-500)", fontSize: 14 }}>
          <div style={{ width: 24, height: 24, border: "3px solid var(--primary-500)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          Analyzing {rowCount > 0 ? `${rowCount} rows` : "your data"}…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state === "error" && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {state === "ready" && (
        <>
          {/* Summary banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8, background: "#F0FDFA", border: "1px solid #CCFBF1", marginBottom: 20, fontSize: 13, color: "#0F766E" }}>
            <Info size={15} />
            <span><strong>{entityNoun(entityType, rowCount)}</strong> ready to import. Original values are always preserved.</span>
          </div>

          {review && <ImportReviewPanel entityType={entityType} review={review} />}

          {summaries.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", border: "1px solid var(--neutral-200)", borderRadius: 12, color: "var(--neutral-500)", fontSize: 14 }}>
              No value conversions need review for this import.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {summaries.map((s) => <SummaryCard key={s.field} summary={s} />)}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => router.push(`/uploads/${uploadId}/map`)}
              style={{ fontSize: 14, fontWeight: 500, padding: "9px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-700)", cursor: "pointer" }}
            >
              Back to mapping
            </button>
            <button
              onClick={() => router.push(`/uploads/${uploadId}/confirm`)}
              style={{ fontSize: 14, fontWeight: 500, padding: "9px 20px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <CheckCircle size={14} />
              Continue →
            </button>
          </div>
        </>
      )}

    </div>
  );
}

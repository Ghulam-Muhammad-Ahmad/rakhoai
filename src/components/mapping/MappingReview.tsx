"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import type { MappingResult, MappingLayer } from "@/lib/matching";

const SCHEMA_FIELDS = [
  { value: "student_name", label: "Student Name" },
  { value: "contact_info", label: "Contact Info" },
  { value: "join_date", label: "Join Date" },
  { value: "last_session_date", label: "Last Session Date" },
  { value: "attendance_rate", label: "Attendance Rate" },
  { value: "last_payment_date", label: "Last Payment Date" },
  { value: "payment_status", label: "Payment Status" },
  { value: "total_sessions", label: "Total Sessions" },
  { value: "fees_amount", label: "Fees Amount" },
  { value: "subject", label: "Subject" },
  { value: "tutor_assigned", label: "Tutor Assigned" },
  { value: "notes", label: "Notes" },
];

type Template = { id: string; name: string; isDefault: boolean; mappingJson: unknown };

interface Props {
  uploadId: string;
  initialMappings: MappingResult[];
  templates: Template[];
}

const LAYER_COLORS: Record<MappingLayer, { bg: string; text: string; label: string }> = {
  exact:   { bg: "#D1FAE5", text: "#065F46", label: "EXACT" },
  fuzzy:   { bg: "#FEF3C7", text: "#92400E", label: "FUZZY" },
  ai:      { bg: "#EDE9FE", text: "#5B21B6", label: "AI" },
  unmapped:{ bg: "#FEE2E2", text: "#991B1B", label: "UNMAPPED" },
};

function confidenceColor(c: number): string {
  if (c >= 0.9) return "#10B981";
  if (c >= 0.6) return "#F59E0B";
  return "#DC2626";
}

export function MappingReview({ uploadId, initialMappings, templates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mappings, setMappings] = useState<MappingResult[]>(
    [...initialMappings].sort((a, b) => a.confidence - b.confidence)
  );
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFieldChange(sourceColumn: string, newField: string | null) {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn
          ? { ...m, suggestedField: newField, confidence: 1.0, layer: "exact" as MappingLayer }
          : m
      )
    );
  }

  async function handleConfirm() {
    setError(null);
    const hasStudentName = mappings.some((m) => m.suggestedField === "student_name");
    if (!hasStudentName) {
      setError("Map at least one column to Student Name before confirming.");
      return;
    }

    if (saveTemplate && !templateName.trim()) {
      setError("Enter a template name.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/uploads/${uploadId}/map`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: mappings.map((m) => ({
            sourceColumn: m.sourceColumn,
            targetField: m.suggestedField,
          })),
          saveAsTemplate: saveTemplate,
          templateName: saveTemplate ? templateName.trim() : undefined,
          setAsDefault: saveTemplate ? setAsDefault : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save mapping.");
        return;
      }

      router.push(`/dashboard`);
    });
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: 0 }}>
          Map your columns
        </h1>
        <p style={{ fontSize: 14, color: "var(--neutral-500)", marginTop: 6 }}>
          We auto-mapped your columns. Review and adjust any that look wrong.
        </p>
      </div>

      {/* Template selector */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <span style={{ color: "var(--neutral-600)", fontWeight: 500 }}>Load template:</span>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                const tm = t.mappingJson as Record<string, string | null>;
                setMappings((prev) =>
                  prev.map((m) =>
                    m.sourceColumn in tm
                      ? { ...m, suggestedField: tm[m.sourceColumn], confidence: 1.0, layer: "exact" as MappingLayer }
                      : m
                  )
                );
              }}
              style={{ padding: "4px 10px", borderRadius: "var(--radius-sm, 6px)", border: "1px solid var(--neutral-200)", background: t.isDefault ? "var(--primary-50, #f0fdfa)" : "#fff", color: t.isDefault ? "var(--primary-600, #0F766E)" : "var(--neutral-700)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              {t.name}{t.isDefault ? " ★" : ""}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {(["exact", "fuzzy", "ai", "unmapped"] as MappingLayer[]).map((layer) => {
          const count = mappings.filter((m) => m.layer === layer).length;
          if (!count) return null;
          const { bg, text, label } = LAYER_COLORS[layer];
          return (
            <div key={layer} style={{ padding: "6px 12px", borderRadius: 20, background: bg, color: text, fontSize: 12, fontWeight: 600 }}>
              {label} · {count}
            </div>
          );
        })}
      </div>

      {/* Mapping table */}
      <div style={{ border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg, 12px)", overflow: "hidden", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--neutral-50, #fafafa)" }}>
              <th style={thStyle}>Your Column</th>
              <th style={thStyle}>Sample Values</th>
              <th style={thStyle}>Maps To</th>
              <th style={{ ...thStyle, width: 90 }}>Confidence</th>
              <th style={{ ...thStyle, width: 80 }}>Method</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => {
              const { bg, text, label } = LAYER_COLORS[m.layer];
              return (
                <tr
                  key={m.sourceColumn}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--neutral-100)" : undefined,
                    background: !m.suggestedField ? "#FFFBEB" : "#fff",
                  }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: "var(--neutral-800)" }}>{m.sourceColumn}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: "var(--neutral-500)", fontFamily: "monospace" }}>
                      {m.sampleValues.slice(0, 3).join(" · ") || "—"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      <select
                        value={m.suggestedField ?? ""}
                        onChange={(e) =>
                          handleFieldChange(m.sourceColumn, e.target.value || null)
                        }
                        style={{
                          appearance: "none",
                          padding: "6px 28px 6px 10px",
                          borderRadius: "var(--radius-sm, 6px)",
                          border: `1px solid ${m.suggestedField ? "var(--neutral-200)" : "#FCA5A5"}`,
                          background: m.suggestedField ? "#fff" : "#FEF2F2",
                          fontSize: 13,
                          color: m.suggestedField ? "var(--neutral-800)" : "#DC2626",
                          cursor: "pointer",
                          minWidth: 180,
                        }}
                      >
                        <option value="">— Ignore —</option>
                        {SCHEMA_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} style={{ position: "absolute", right: 8, pointerEvents: "none", color: "var(--neutral-400)" }} />
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {m.suggestedField ? (
                      <span style={{ fontWeight: 600, color: confidenceColor(m.confidence) }}>
                        {Math.round(m.confidence * 100)}%
                      </span>
                    ) : (
                      <span style={{ color: "#DC2626" }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{ padding: "2px 7px", borderRadius: 10, background: bg, color: text, fontSize: 11, fontWeight: 700 }}>
                      {label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save template */}
      <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "var(--neutral-700)" }}>
          <input
            type="checkbox"
            checked={saveTemplate}
            onChange={(e) => setSaveTemplate(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: "var(--primary-500)" }}
          />
          Save this mapping as a reusable template
        </label>
        {saveTemplate && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name (e.g. Main spreadsheet)"
              style={{ flex: 1, minWidth: 220, padding: "7px 12px", borderRadius: "var(--radius-sm, 6px)", border: "1px solid var(--neutral-200)", fontSize: 13, color: "var(--neutral-800)", outline: "none" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--neutral-600)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: "var(--primary-500)" }}
              />
              Set as default (auto-apply on future uploads)
            </label>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#DC2626" }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          onClick={() => router.back()}
          style={{ fontSize: 14, fontWeight: 500, padding: "9px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-700)", cursor: "pointer" }}
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          style={{ fontSize: 14, fontWeight: 500, padding: "9px 18px", borderRadius: "var(--radius-md)", border: "none", background: isPending ? "var(--neutral-300)" : "var(--primary-500)", color: "#fff", cursor: isPending ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          {isPending ? (
            <>
              <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle size={14} />
              Confirm mapping
            </>
          )}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 11,
  color: "var(--neutral-500)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid var(--neutral-200)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
};

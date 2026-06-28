"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, ChevronDown, Ban } from "lucide-react";
import type { MappingResult, MappingLayer } from "@/lib/matching";
import type { EntityType } from "@/lib/imports/types";
import type { ImportField } from "@/lib/imports/schema";

const SCHEMA_FIELDS = [
  { value: "student_name",     label: "Student Name",       desc: "Required. Identifies each student row." },
  { value: "contact_info",     label: "Contact Info",       desc: "Phone or email for outreach." },
  { value: "join_date",        label: "Join Date",          desc: "When the student enrolled." },
  { value: "last_session_date",label: "Last Session Date",  desc: "Days since last session drives risk score." },
  { value: "attendance_rate",  label: "Attendance Rate",    desc: "0–100 %. Low attendance = high risk." },
  { value: "last_payment_date",label: "Last Payment Date",  desc: "Date of most recent payment." },
  { value: "payment_status",   label: "Payment Status",     desc: "Overdue / paid / pending text value." },
  { value: "total_sessions",   label: "Total Sessions",     desc: "Total sessions attended or scheduled." },
  { value: "fees_amount",      label: "Fees Amount",        desc: "Monthly fee — used for revenue-at-risk." },
  { value: "subject",          label: "Subject",            desc: "Class or subject the student is in." },
  { value: "tutor_assigned",   label: "Tutor Assigned",     desc: "Tutor name linked to this student." },
  { value: "notes",            label: "Notes",              desc: "Free-text notes shown on student profile." },
];

function FieldSelect({ value, onChange, invalid, usedFields, fields }: {
  value: string | null;
  onChange: (v: string | null) => void;
  invalid?: boolean;
  usedFields?: Set<string>;
  fields?: ImportField[];
}) {
  const [open, setOpen] = useState(false);
  // Menu uses fixed positioning anchored to the button rect so it is not clipped
  // by the table wrapper's overflow:hidden. `up` flips it above the button when
  // there isn't room below in the viewport (bottom rows).
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const fieldOptions: ImportField[] = fields ?? SCHEMA_FIELDS.map((field) => ({ ...field, identifier: false }));
  const selected = fieldOptions.find((f) => f.value === value);

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < 320 && r.top > spaceBelow;
      setMenuPos({ top: up ? r.top : r.bottom, left: r.left, width: r.width, up });
    }
    setOpen(true);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 200 }}>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "6px 10px", borderRadius: "var(--radius-sm, 6px)", cursor: "pointer",
          border: `1px solid ${invalid ? "#FCA5A5" : "var(--neutral-200)"}`,
          background: invalid ? "#FEF2F2" : "#fff",
          color: invalid ? "#DC2626" : "var(--neutral-800)",
          fontSize: 13, fontWeight: 500, textAlign: "left",
        }}
      >
        <span>{selected ? selected.label : <span style={{ color: "#DC2626" }}>Unmapped</span>}</span>
        <ChevronDown size={12} style={{ flexShrink: 0, color: "var(--neutral-400)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && menuPos && (
        <div style={{
          position: "fixed",
          left: menuPos.left,
          top: menuPos.up ? undefined : menuPos.top + 4,
          bottom: menuPos.up ? window.innerHeight - menuPos.top + 4 : undefined,
          zIndex: 1000,
          background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)", minWidth: Math.max(260, menuPos.width), maxHeight: 320, overflowY: "auto",
        }}>
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--neutral-100)", color: "var(--neutral-400)", fontSize: 12 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--neutral-50)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            — Unmapped
          </div>
          {fieldOptions.map((f) => {
            const isCurrent = value === f.value;
            const isTaken = !isCurrent && (usedFields?.has(f.value) ?? false);
            return (
              <div
                key={f.value}
                onClick={() => { onChange(f.value); setOpen(false); }}
                style={{
                  padding: "9px 12px", cursor: "pointer",
                  background: isCurrent ? "var(--primary-50, #f0fdfa)" : isTaken ? "#FAFAFA" : "",
                  borderBottom: "1px solid var(--neutral-100)",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
                }}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = isTaken ? "#F3F4F6" : "var(--neutral-50)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isCurrent ? "var(--primary-50, #f0fdfa)" : isTaken ? "#FAFAFA" : ""; }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isCurrent ? "#0F766E" : isTaken ? "var(--neutral-400)" : "var(--neutral-800)" }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "var(--neutral-400)", marginTop: 2 }}>{f.desc}</div>
                </div>
                {isTaken && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#F59E0B", background: "#FEF3C7", padding: "2px 6px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>
                    <Ban size={9} /> already used
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Template = { id: string; name: string; isDefault: boolean; mappingJson: unknown };

interface Props {
  uploadId: string;
  initialMappings: MappingResult[];
  templates: Template[];
  entityType?: EntityType;
  fields?: ImportField[];
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

function deduplicateMappings(mappings: MappingResult[]): MappingResult[] {
  // Per target field, keep highest-confidence mapping. Null out duplicates.
  const bestByField = new Map<string, { col: string; confidence: number }>();
  for (const m of mappings) {
    if (!m.suggestedField) continue;
    const existing = bestByField.get(m.suggestedField);
    if (!existing || m.confidence > existing.confidence) {
      bestByField.set(m.suggestedField, { col: m.sourceColumn, confidence: m.confidence });
    }
  }
  return mappings.map((m) => {
    if (!m.suggestedField) return m;
    const best = bestByField.get(m.suggestedField);
    if (best && best.col !== m.sourceColumn) {
      return { ...m, suggestedField: null, layer: "unmapped" as MappingLayer, confidence: 0 };
    }
    return m;
  });
}

function suspiciousMappingMessage(mapping: MappingResult): string | null {
  const key = mapping.sourceColumn.toLowerCase().replace(/[\s_\-()./]/g, "");
  if ((key === "sessionid" || key === "paymentid") && !mapping.suggestedField) {
    return `${mapping.sourceColumn} looks like a row ID, not a date.`;
  }
  if (key.endsWith("id") && !key.includes("student") && !mapping.suggestedField) {
    return `${mapping.sourceColumn} looks like a record ID. Map it to an ID field (e.g. Teacher ID) if relevant, otherwise leave it unmapped.`;
  }
  return null;
}

const IDENTIFIER_WARNINGS: Record<string, string> = {
  student_identifier: "Best choice. This gives the most accurate matching.",
  phone: "Good, but siblings may share one parent phone number. Review matches carefully.",
  email: "Good if every student has a unique email.",
  student_name: "Risky. Names can be misspelled or duplicated. Rakho AI will ask you to review matches.",
};

export function MappingReview({ uploadId, initialMappings, templates, entityType = "students", fields }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mappings, setMappings] = useState<MappingResult[]>(
    deduplicateMappings([...initialMappings]).sort((a, b) => a.confidence - b.confidence)
  );
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "saving" | "processing">("idle");
  const [dupNotice, setDupNotice] = useState<string | null>(null);
  const fieldOptions: ImportField[] = fields ?? SCHEMA_FIELDS.map((field) => ({ ...field, identifier: false }));
  const identifierFields = fieldOptions.filter((field) => field.identifier);
  const initialIdentifier =
    initialMappings.find((mapping) => mapping.suggestedField === "student_identifier")?.sourceColumn ??
    initialMappings.find((mapping) => ["email", "phone", "student_name"].includes(mapping.suggestedField ?? ""))?.sourceColumn ??
    "";
  const [identifierColumn, setIdentifierColumn] = useState(initialIdentifier);
  const selectedIdentifierMapping = mappings.find((mapping) => mapping.sourceColumn === identifierColumn);
  const identifierWarning = selectedIdentifierMapping?.suggestedField
    ? IDENTIFIER_WARNINGS[selectedIdentifierMapping.suggestedField] ?? null
    : null;

  function handleFieldChange(sourceColumn: string, newField: string | null) {
    setDupNotice(null);
    setMappings((prev) => {
      // If newField is already taken by another column, unmap that column first
      let bumped: string | null = null;
      const updated = prev.map((m) => {
        if (newField && m.sourceColumn !== sourceColumn && m.suggestedField === newField) {
          bumped = m.sourceColumn;
          return { ...m, suggestedField: null, layer: "unmapped" as MappingLayer, confidence: 0 };
        }
        if (m.sourceColumn === sourceColumn) {
          return { ...m, suggestedField: newField, confidence: 1.0, layer: "exact" as MappingLayer };
        }
        return m;
      });
      if (bumped) {
        const field = SCHEMA_FIELDS.find((f) => f.value === newField);
        setDupNotice(`"${bumped}" was unmapped — ${field?.label ?? newField} can only be assigned once.`);
      }
      return updated;
    });
  }

  async function handleConfirm() {
    setError(null);
    const requiredField = entityType === "teachers" ? "teacher_name" : entityType === "students" ? "student_name" : "student_identifier";
    const hasRequired = mappings.some((m) => m.suggestedField === requiredField);
    if (!hasRequired) {
      setError(`Map at least one column to ${fieldOptions.find((f) => f.value === requiredField)?.label ?? requiredField} before confirming.`);
      return;
    }
    if ((entityType === "sessions" || entityType === "payments") && !identifierColumn) {
      setError("Choose the Student Identifier column before continuing.");
      return;
    }

    if (saveTemplate && !templateName.trim()) {
      setError("Enter a template name.");
      return;
    }

    setPhase("saving");
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
          identifierColumn: identifierColumn || undefined,
          processNow: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPhase("idle");
        setError(data.error ?? "Failed to save mapping.");
        return;
      }

      setPhase("processing");
      router.push(`/uploads/${uploadId}/normalize`);
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
          We auto-mapped this {entityType.slice(0, -1)} file. Review identifiers and any low-confidence matches before import.
        </p>
      </div>

      {identifierFields.length > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 8, border: "1px solid var(--neutral-200)", background: "#fff" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 8 }}>
            Student Identifier
          </div>
          <div style={{ fontSize: 12, color: "var(--neutral-500)", marginBottom: 10 }}>
            Rakho AI recommends a stable Student ID, Roll No, Reg No, Admission No, or Student Code. Row number is not valid.
          </div>
          <select
            value={identifierColumn}
            onChange={(event) => setIdentifierColumn(event.target.value)}
            style={{ width: "100%", maxWidth: 360, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--neutral-200)", fontSize: 13, color: "var(--neutral-800)", background: "#fff" }}
          >
            <option value="">Choose identifier column</option>
            {mappings
              .filter((mapping) => ["student_identifier", "email", "phone", "student_name"].includes(mapping.suggestedField ?? ""))
              .map((mapping) => (
                <option key={mapping.sourceColumn} value={mapping.sourceColumn}>
                  {mapping.sourceColumn} {"->"} {fieldOptions.find((field) => field.value === mapping.suggestedField)?.label ?? mapping.suggestedField}
                </option>
              ))}
          </select>
          {identifierWarning && (
            <div style={{ marginTop: 10, fontSize: 12, color: selectedIdentifierMapping?.suggestedField === "student_identifier" ? "#047857" : "#92400E" }}>
              {identifierWarning}
            </div>
          )}
        </div>
      )}

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

      {/* Duplicate field notice */}
      {dupNotice && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 12, fontSize: 13, color: "#92400E" }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          {dupNotice}
          <button onClick={() => setDupNotice(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#92400E", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

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
              const warning = suspiciousMappingMessage(m);
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
                    {warning && <div style={{ marginTop: 4, fontSize: 11, color: "#B45309" }}>{warning}</div>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: "var(--neutral-500)", fontFamily: "monospace" }}>
                      {m.sampleValues.slice(0, 3).join(" · ") || "—"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <FieldSelect
                      value={m.suggestedField ?? null}
                      onChange={(v) => handleFieldChange(m.sourceColumn, v)}
                      invalid={!m.suggestedField}
                      usedFields={new Set(mappings.filter((x) => x.sourceColumn !== m.sourceColumn && x.suggestedField).map((x) => x.suggestedField as string))}
                      fields={fields}
                    />
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
              {phase === "processing" ? "Scoring students..." : "Saving mapping..."}
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

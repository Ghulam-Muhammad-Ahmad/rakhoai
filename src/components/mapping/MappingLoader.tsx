"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle, Zap, Shuffle, Cpu, AlertTriangle, AlertCircle } from "lucide-react";
import { MappingReview } from "./MappingReview";
import type { MappingResult } from "@/lib/matching";
import type { EntityType } from "@/lib/imports/types";
import type { ImportField } from "@/lib/imports/schema";

type Template = { id: string; name: string; isDefault: boolean; mappingJson: unknown };

type Stage = "exact" | "fuzzy" | "ai" | "done";

const STAGE_CONFIG = [
  { key: "exact", icon: Zap,    label: "Matching column names exactly",     color: "#10B981", bg: "#D1FAE5" },
  { key: "fuzzy", icon: Shuffle, label: "Running fuzzy similarity matching", color: "#F59E0B", bg: "#FEF3C7" },
  { key: "ai",    icon: Cpu,    label: "AI semantic matching for the rest",  color: "#8B5CF6", bg: "#EDE9FE" },
] as const;

// Minimum display time per stage so user can actually read it
const STAGE_MIN_MS = [400, 700, 0] as const;

const REQUIRED_FIELDS = ["student_name"];
const RECOMMENDED_FIELDS: Record<string, string> = {
  last_session_date: "Last Session Date",
  attendance_rate: "Attendance Rate",
  payment_status: "Payment Status",
};

function LayerBadge({ layer, count }: { layer: string; count: number }) {
  const config = {
    exact:    { label: "Exact",    color: "#065F46", bg: "#D1FAE5" },
    fuzzy:    { label: "Fuzzy",    color: "#92400E", bg: "#FEF3C7" },
    ai:       { label: "AI",       color: "#5B21B6", bg: "#EDE9FE" },
    unmapped: { label: "Unmapped", color: "#991B1B", bg: "#FEE2E2" },
  }[layer] ?? { label: layer, color: "#6B7280", bg: "#F3F4F6" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: config.color, background: config.bg, padding: "2px 8px", borderRadius: 99 }}>{config.label}</span>
      <span style={{ fontSize: 13, color: "var(--neutral-600)", fontWeight: 500 }}>{count} column{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

export function MappingLoader({ uploadId, templates }: { uploadId: string; templates: Template[] }) {
  const [stage, setStage] = useState<Stage>("exact");
  const [mappings, setMappings] = useState<MappingResult[] | null>(null);
  const [entityType, setEntityType] = useState<EntityType>("students");
  const [fields, setFields] = useState<ImportField[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<Stage>("exact");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let apiDone = false;
    let apiMappings: MappingResult[] | null = null;
    let stageIndex = 0;

    function advanceStage() {
      const stages: Stage[] = ["exact", "fuzzy", "ai", "done"];
      stageIndex++;
      const next = stages[stageIndex];
      stageRef.current = next;
      setStage(next);

      if (next === "done") {
        // Show results
        setMappings(apiMappings);
        return;
      }

      const minMs = STAGE_MIN_MS[stageIndex] ?? 0;

      if (stageIndex === 2 && apiDone) {
        // AI stage — API already done, finish after minimum wait
        timerRef.current = setTimeout(advanceStage, minMs);
      } else if (stageIndex < 2) {
        timerRef.current = setTimeout(advanceStage, minMs);
      }
      // else: AI stage, wait for apiDone signal
    }

    // Start first stage timer
    timerRef.current = setTimeout(advanceStage, STAGE_MIN_MS[0]);

    // Fire mapping API
    fetch(`/api/uploads/${uploadId}/map`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        apiDone = true;
        apiMappings = data.mappings ?? [];
        setEntityType(data.entityType ?? "students");
        setFields(data.fields ?? null);
        // If already at AI stage or past, advance now
        if (stageRef.current === "ai") {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(advanceStage, 300);
        }
        // else stages will naturally advance and check apiDone at AI stage
      })
      .catch(() => setError("Failed to run column mapping. Please try again."));

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [uploadId]);

  // Compute validation warnings once mappings are available
  const mappedFields = mappings
    ? mappings.filter((m) => m.suggestedField && m.confidence >= 0.4).map((m) => m.suggestedField as string)
    : [];

  const requiredFields = entityType === "teachers" ? ["teacher_name"] : entityType === "students" ? REQUIRED_FIELDS : ["student_identifier"];
  const missingRequired = requiredFields.filter((f) => !mappedFields.includes(f));
  const missingRecommended = Object.keys(RECOMMENDED_FIELDS).filter((f) => !mappedFields.includes(f));

  // Layer counts
  const layerCounts = mappings
    ? (["exact", "fuzzy", "ai", "unmapped"] as const).reduce<Record<string, number>>((acc, l) => {
        acc[l] = mappings.filter((m) => m.layer === l).length;
        return acc;
      }, {})
    : {};

  if (error) {
    return (
      <div style={{ padding: "16px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (!mappings) {
    return (
      <div style={{ maxWidth: 520, margin: "48px auto" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--neutral-900)", marginBottom: 6 }}>
            Mapping your columns
          </div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>
            We use 3 layers to match your headers to our schema.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STAGE_CONFIG.map((s, i) => {
            const stageOrder: Stage[] = ["exact", "fuzzy", "ai"];
            const currentIdx = stageOrder.indexOf(stage);
            const thisIdx = i;
            const done = thisIdx < currentIdx;
            const active = thisIdx === currentIdx;
            const Icon = s.icon;

            return (
              <div
                key={s.key}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 10,
                  border: `1px solid ${active ? s.color + "66" : "var(--neutral-200)"}`,
                  background: active ? s.bg + "55" : done ? "var(--neutral-50)" : "#fff",
                  transition: "all 0.3s",
                  opacity: thisIdx > currentIdx ? 0.4 : 1,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: done ? "#D1FAE5" : active ? s.bg : "var(--neutral-100)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.3s" }}>
                  {done
                    ? <CheckCircle size={18} color="#10B981" />
                    : <Icon size={18} color={active ? s.color : "var(--neutral-400)"} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: active ? "var(--neutral-900)" : done ? "var(--neutral-600)" : "var(--neutral-400)" }}>
                    {s.label}
                  </div>
                </div>
                {active && (
                  <div style={{ width: 18, height: 18, border: `2px solid ${s.color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                )}
                {done && <CheckCircle size={16} color="#10B981" />}
              </div>
            );
          })}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Results view
  return (
    <div>
      {/* Layer summary bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 16px", borderRadius: 8, background: "var(--neutral-50)", border: "1px solid var(--neutral-200)", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mapping result</span>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {(["exact", "fuzzy", "ai", "unmapped"] as const).map((l) =>
            (layerCounts[l] ?? 0) > 0 ? <LayerBadge key={l} layer={l} count={layerCounts[l]} /> : null
          )}
        </div>
      </div>

      {/* Required column missing — block */}
      {missingRequired.length > 0 && (
        <div style={{ display: "flex", gap: 10, padding: "12px 16px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 12, fontSize: 13, color: "#DC2626" }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Required column not found.</strong> Map the required identifier/name column before continuing.
          </div>
        </div>
      )}

      {/* Recommended columns missing — warn */}
      {missingRequired.length === 0 && missingRecommended.length > 0 && (
        <div style={{ display: "flex", gap: 10, padding: "12px 16px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 12, fontSize: 13, color: "#92400E" }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Missing recommended columns:</strong> {missingRecommended.map((f) => RECOMMENDED_FIELDS[f]).join(", ")}. Risk scoring will be less accurate without these.
          </div>
        </div>
      )}

      <MappingReview uploadId={uploadId} initialMappings={mappings} templates={templates} entityType={entityType} fields={fields ?? undefined} />
    </div>
  );
}

import { exactMatch } from "./exact";
import { fuzzyMatch } from "./fuzzy";
import { aiMatch } from "./ai";
import { getImportFields } from "@/lib/imports/schema";
import type { EntityType } from "@/lib/imports/types";
import { applyMappingGuardrails } from "./guardrails";

export { applyMappingGuardrails } from "./guardrails";

export type MappingLayer = "exact" | "fuzzy" | "ai" | "unmapped";

export type MappingResult = {
  sourceColumn: string;
  sampleValues: string[];
  suggestedField: string | null;
  confidence: number;
  layer: MappingLayer;
};

export const SCHEMA_FIELDS = [
  "student_identifier",
  "student_name",
  "contact_info",
  "email",
  "phone",
  "join_date",
  "last_session_date",
  "attendance_rate",
  "last_payment_date",
  "payment_status",
  "total_sessions",
  "fees_amount",
  "subject",
  "tutor_assigned",
  "teacher_name",
  "notes",
  "session_date",
  "session_id",
  "attendance_status",
  "duration_minutes",
  "attended_sessions",
  "payment_id",
  "billing_month",
  "due_date",
  "paid_date",
  "payment_date",
  "amount",
  "overdue_amount",
  "method",
  "monthly_fee",
] as const;

export type SchemaField = (typeof SCHEMA_FIELDS)[number];

export async function runMapping(
  headers: string[],
  sampleRows: Record<string, string>[],
  uploadId: string,
  existingTemplate?: Record<string, string | null> | null,
  entityType: EntityType = "students"
): Promise<MappingResult[]> {
  const results: MappingResult[] = [];
  const needsAi: { column: string; samples: string[]; idx: number }[] = [];
  const allowedFields = getImportFields(entityType).map((field) => field.value);

  for (let i = 0; i < headers.length; i++) {
    const col = headers[i];
    const samples = sampleRows
      .map((r) => String(r[col] ?? ""))
      .filter(Boolean)
      .slice(0, 3);

    // Template pre-fill
    if (existingTemplate && col in existingTemplate && (!existingTemplate[col] || allowedFields.includes(existingTemplate[col]!))) {
      results.push({
        sourceColumn: col,
        sampleValues: samples,
        suggestedField: existingTemplate[col],
        confidence: 1.0,
        layer: "exact",
      });
      continue;
    }

    // Layer 1 — exact
    const exact = exactMatch(col, allowedFields);
    if (exact) {
      results.push({ sourceColumn: col, sampleValues: samples, suggestedField: exact.field, confidence: exact.confidence, layer: "exact" });
      continue;
    }

    // Layer 2 — fuzzy
    const fuzzy = fuzzyMatch(col, allowedFields);
    if (fuzzy && fuzzy.confidence >= 0.75) {
      results.push({ sourceColumn: col, sampleValues: samples, suggestedField: fuzzy.field, confidence: fuzzy.confidence, layer: "fuzzy" });
      continue;
    }

    // Queue for Layer 3 — AI
    results.push({
      sourceColumn: col,
      sampleValues: samples,
      suggestedField: fuzzy?.field ?? null,
      confidence: fuzzy?.confidence ?? 0,
      layer: fuzzy ? "fuzzy" : "unmapped",
    });
    needsAi.push({ column: col, samples, idx: i });
  }

  if (needsAi.length > 0) {
    // Layer 3 — AI sees everything: unmatched columns + already-mapped for verification
    const alreadyMapped = results
      .filter((r) => r.suggestedField && (r.layer === "exact" || r.layer === "fuzzy"))
      .map((r) => ({
        column: r.sourceColumn,
        field: r.suggestedField as string,
        layer: r.layer as "exact" | "fuzzy",
        samples: r.sampleValues,
      }));

    const aiResults = await aiMatch(
      needsAi.map(({ column, samples }) => ({ column, samples })),
      uploadId,
      alreadyMapped,
      entityType
    );

    // Apply AI results for previously-unmapped columns
    for (const { column, idx } of needsAi) {
      const ai = aiResults[column];
      if (ai && ai.field && allowedFields.includes(ai.field) && ai.confidence >= 0.5) {
        results[idx] = {
          ...results[idx],
          suggestedField: ai.field,
          confidence: ai.confidence,
          layer: "ai",
        };
      }
    }

    // Apply AI corrections to already-mapped columns
    // Rule: AI can correct or demote FUZZY matches only. Exact matches are trusted — AI can only confirm them.
    for (const { column, layer } of alreadyMapped) {
      const ai = aiResults[column];
      if (!ai) continue;
      const idx = results.findIndex((r) => r.sourceColumn === column);
      if (idx === -1) continue;

      if (layer === "exact") {
        // Exact match — AI confirmation only, never override
        if (ai.field === results[idx].suggestedField) {
          results[idx] = { ...results[idx], confidence: Math.min(1.0, results[idx].confidence + 0.02) };
        }
        // AI disagrees with exact → ignore, keep exact as-is
      } else {
        // Fuzzy match — AI can correct or demote
        if (ai.field === null || !allowedFields.includes(ai.field)) {
          results[idx] = { ...results[idx], suggestedField: null, confidence: 0, layer: "unmapped" };
        } else if (ai.field !== results[idx].suggestedField) {
          results[idx] = { ...results[idx], suggestedField: ai.field, confidence: ai.confidence, layer: "ai" };
        } else {
          // AI confirmed fuzzy — boost confidence slightly
          results[idx] = { ...results[idx], confidence: Math.min(1.0, results[idx].confidence + 0.05) };
        }
      }
    }
  }

  return applyMappingGuardrails(results, entityType);
}

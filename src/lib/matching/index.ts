import { exactMatch } from "./exact";
import { fuzzyMatch } from "./fuzzy";
import { aiMatch } from "./ai";

export type MappingLayer = "exact" | "fuzzy" | "ai" | "unmapped";

export type MappingResult = {
  sourceColumn: string;
  sampleValues: string[];
  suggestedField: string | null;
  confidence: number;
  layer: MappingLayer;
};

export const SCHEMA_FIELDS = [
  "student_name",
  "contact_info",
  "join_date",
  "last_session_date",
  "attendance_rate",
  "last_payment_date",
  "payment_status",
  "total_sessions",
  "fees_amount",
  "subject",
  "tutor_assigned",
  "notes",
] as const;

export type SchemaField = (typeof SCHEMA_FIELDS)[number];

export async function runMapping(
  headers: string[],
  sampleRows: Record<string, string>[],
  uploadId: string,
  existingTemplate?: Record<string, string | null> | null
): Promise<MappingResult[]> {
  const results: MappingResult[] = [];
  const needsAi: { column: string; samples: string[]; idx: number }[] = [];

  for (let i = 0; i < headers.length; i++) {
    const col = headers[i];
    const samples = sampleRows
      .map((r) => String(r[col] ?? ""))
      .filter(Boolean)
      .slice(0, 3);

    // Template pre-fill
    if (existingTemplate && col in existingTemplate) {
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
    const exact = exactMatch(col);
    if (exact) {
      results.push({ sourceColumn: col, sampleValues: samples, suggestedField: exact.field, confidence: exact.confidence, layer: "exact" });
      continue;
    }

    // Layer 2 — fuzzy
    const fuzzy = fuzzyMatch(col);
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

  // Layer 3 — batch AI call for all misses
  if (needsAi.length > 0) {
    const aiResults = await aiMatch(
      needsAi.map(({ column, samples }) => ({ column, samples })),
      uploadId
    );

    for (const { column, idx } of needsAi) {
      const ai = aiResults[column];
      if (ai && ai.field && ai.confidence >= 0.5) {
        results[idx] = {
          ...results[idx],
          suggestedField: ai.field,
          confidence: ai.confidence,
          layer: "ai",
        };
      }
    }
  }

  return results;
}

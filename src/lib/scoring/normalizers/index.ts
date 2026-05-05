export type { NormalizedField, NormalizationSummary } from "./types";
export { normalizeAttendance } from "./attendance";
export { normalizePaymentStatus } from "./paymentStatus";
export { normalizeNumeric } from "./numericText";
export { normalizeDate } from "./dateField";
export { aiNormalizeAttendance, aiNormalizePaymentStatus } from "./ai-fallback";

import type { NormalizationSummary, NormalizedField } from "./types";

// Build a summary from an array of normalized field results for UX preview
export function buildSummary<T>(
  field: string,
  label: string,
  results: NormalizedField<T>[],
  formatValue: (v: T | null) => string | number | null
): NormalizationSummary {
  const groupMap = new Map<string, NormalizationSummary["groups"][number]>();

  for (const r of results) {
    const rawKey = String(r.originalValue ?? "");
    if (!groupMap.has(rawKey)) {
      groupMap.set(rawKey, {
        raw: rawKey,
        normalized: formatValue(r.value),
        sourceType: r.sourceType,
        confidence: r.confidence,
        count: 0,
      });
    }
    groupMap.get(rawKey)!.count++;
  }

  const groups = [...groupMap.values()].sort((a, b) => b.count - a.count);
  const lowConfidenceCount = groups.filter((g) => g.confidence > 0 && g.confidence < 0.8).reduce((s, g) => s + g.count, 0);
  const unknownCount = groups.filter((g) => g.confidence === 0).reduce((s, g) => s + g.count, 0);

  return { field, label, groups, lowConfidenceCount, unknownCount };
}

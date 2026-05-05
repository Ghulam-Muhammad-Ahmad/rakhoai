import type { NormalizedField } from "./types";

// Strip noise from numeric strings: currency symbols, units, commas, approximations
function cleanNumeric(text: string): { cleaned: string; sourceType: string } {
  let t = text.trim();
  let sourceType = "number";

  // k/K suffix: "12k" → 12000
  if (/^\d+(\.\d+)?[kK]$/.test(t)) {
    return { cleaned: String(parseFloat(t) * 1000), sourceType: "k_suffix" };
  }

  // Approx markers
  if (/^[~≈≤≥<>]/.test(t) || /^approx\.?\s*/i.test(t)) {
    t = t.replace(/^[~≈≤≥<>]/, "").replace(/^approx\.?\s*/i, "");
    sourceType = "approximate";
  }

  // Strip currency symbols and thousand separators
  const stripped = t.replace(/[^0-9.,\-]/g, "").replace(/,(?=\d{3})/g, "");
  return { cleaned: stripped, sourceType };
}

export function normalizeNumeric(value: unknown, allowDecimal = true): NormalizedField<number> {
  const original = value;

  if (value == null || String(value).trim() === "") {
    return { value: null, sourceType: "empty", originalValue: original, confidence: 0 };
  }

  const text = String(value).trim();

  if (text === "-" || text.toLowerCase() === "n/a" || text.toLowerCase() === "none") {
    return { value: null, sourceType: "null_marker", originalValue: original, confidence: 1.0 };
  }

  const { cleaned, sourceType } = cleanNumeric(text);
  const parsed = parseFloat(cleaned);

  if (!isFinite(parsed)) {
    return { value: null, sourceType: "unknown", originalValue: original, confidence: 0 };
  }

  const finalValue = allowDecimal ? parsed : Math.round(parsed);
  const confidence = sourceType === "approximate" ? 0.8 : 1.0;

  return { value: finalValue, sourceType, originalValue: original, confidence };
}

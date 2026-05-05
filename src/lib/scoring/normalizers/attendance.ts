import type { NormalizedField } from "./types";

const PRESENT_WORDS = new Set(["present", "p", "true", "yes", "1", "attended", "y", "present(p)"]);
const ABSENT_WORDS = new Set(["absent", "a", "false", "no", "0", "absent(a)", "n"]);

export function normalizeAttendance(value: unknown): NormalizedField<number> {
  const original = value;

  if (value == null || String(value).trim() === "") {
    return { value: null, sourceType: "empty", originalValue: original, confidence: 0 };
  }

  const text = String(value).trim();

  // Percentage string: "85%" or "85 %"
  if (/^\d+(\.\d+)?\s*%$/.test(text)) {
    const parsed = parseFloat(text);
    if (isFinite(parsed)) return { value: parsed, sourceType: "percentage", originalValue: original, confidence: 1.0 };
  }

  // Fraction: "18/25" or "18 / 25"
  if (/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(text)) {
    const [num, den] = text.split("/").map((s) => parseFloat(s.trim()));
    if (den > 0) return { value: Math.round((num / den) * 100), sourceType: "fraction", originalValue: original, confidence: 1.0 };
  }

  // Pure number
  const num = parseFloat(text.replace(/,/g, ""));
  if (isFinite(num)) {
    // Ratio (0–1)
    if (num >= 0 && num <= 1) {
      return { value: Math.round(num * 100), sourceType: "ratio", originalValue: original, confidence: 0.95 };
    }
    // Percentage range (0–100)
    if (num >= 0 && num <= 100) {
      return { value: num, sourceType: "percentage", originalValue: original, confidence: 1.0 };
    }
    // Out of range
    return { value: null, sourceType: "out_of_range", originalValue: original, confidence: 0 };
  }

  // Boolean text
  const lower = text.toLowerCase();
  if (PRESENT_WORDS.has(lower)) {
    return { value: 100, sourceType: "boolean_text", originalValue: original, confidence: 0.9 };
  }
  if (ABSENT_WORDS.has(lower)) {
    return { value: 0, sourceType: "boolean_text", originalValue: original, confidence: 0.9 };
  }

  // Unresolved — will be handled by AI fallback
  return { value: null, sourceType: "unknown", originalValue: original, confidence: 0 };
}

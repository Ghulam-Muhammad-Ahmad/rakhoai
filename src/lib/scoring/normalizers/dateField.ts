import type { NormalizedField } from "./types";

// Excel serial date: days since 1899-12-30
function fromExcelSerial(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

const DMY = /^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})$/;

export function normalizeDate(value: unknown): NormalizedField<Date> {
  const original = value;

  if (value == null || String(value).trim() === "") {
    return { value: null, sourceType: "empty", originalValue: original, confidence: 0 };
  }

  // Excel serial number
  if (typeof value === "number" && value > 1 && value < 200000) {
    const d = fromExcelSerial(value);
    if (!isNaN(d.getTime())) {
      return { value: d, sourceType: "excel_serial", originalValue: original, confidence: 1.0 };
    }
  }

  const text = String(value).trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = DMY.exec(text);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = y.length === 2 ? (parseInt(y) > 50 ? 1900 + parseInt(y) : 2000 + parseInt(y)) : parseInt(y);
    const date = new Date(year, parseInt(m) - 1, parseInt(d));
    if (
      !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === parseInt(m) - 1 &&
      date.getDate() === parseInt(d)
    ) {
      return { value: date, sourceType: "dmy", originalValue: original, confidence: 0.9 };
    }
  }

  // ISO or standard JS parseable
  const direct = new Date(text);
  if (!isNaN(direct.getTime())) {
    return { value: direct, sourceType: "iso", originalValue: original, confidence: 1.0 };
  }

  // Relative dates (e.g., "2 weeks ago") — too risky to infer, return null with warning
  if (/\b(ago|yesterday|last|week|month|year)\b/i.test(text)) {
    return { value: null, sourceType: "relative_date", originalValue: original, confidence: 0 };
  }

  return { value: null, sourceType: "unknown", originalValue: original, confidence: 0 };
}

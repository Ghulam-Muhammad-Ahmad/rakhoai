import type { EntityType, ImportFormat } from "./types.ts";

export type FormatDetection = {
  entityType: EntityType;
  format: ImportFormat;
  supported: boolean;
  warnings: string[];
};

function looksLikeDateColumn(header: string): boolean {
  const trimmed = header.trim();
  return (
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}$/i.test(trimmed)
  );
}

function looksLikeMonthColumn(header: string): boolean {
  return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}$/i.test(header.trim());
}

// Detection no longer gates on specific header names. Any sheet is accepted and
// the mapping step decides what each column is (and enforces a required
// identifier). The only rejections left are the genuinely unsupported
// multi-column-per-period layouts (one column per date / per month), which the
// importer can't read.
export function detectImportFormat(entityType: EntityType, headers: string[]): FormatDetection {
  const warnings: string[] = [];

  if (entityType === "students") {
    return { entityType, format: "roster", supported: true, warnings };
  }

  if (entityType === "teachers") {
    return { entityType, format: "teacher_list", supported: true, warnings };
  }

  if (entityType === "sessions") {
    if (headers.filter(looksLikeDateColumn).length >= 2) {
      return {
        entityType,
        format: "wide",
        supported: false,
        warnings: ["Wide attendance sheets are not supported yet. Use the sessions template with one row per session."],
      };
    }
    return { entityType, format: "long", supported: true, warnings };
  }

  if (entityType === "payments") {
    if (headers.filter(looksLikeMonthColumn).length >= 2) {
      return {
        entityType,
        format: "monthly_wide",
        supported: false,
        warnings: ["Monthly wide payment sheets are not supported yet. Use the payments template with one row per payment."],
      };
    }
    return { entityType, format: "transaction", supported: true, warnings };
  }

  return { entityType, format: "unknown", supported: false, warnings: [] };
}

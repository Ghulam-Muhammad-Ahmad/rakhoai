import type { EntityType, ImportFormat } from "./types.ts";

export type FormatDetection = {
  entityType: EntityType;
  format: ImportFormat;
  supported: boolean;
  warnings: string[];
};

function key(header: string): string {
  return header.toLowerCase().trim().replace(/[\s_\-/.()]/g, "");
}

function hasAny(headers: string[], candidates: string[]): boolean {
  const keys = new Set(headers.map(key));
  return candidates.some((candidate) => keys.has(key(candidate)));
}

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

export function detectImportFormat(entityType: EntityType, headers: string[]): FormatDetection {
  const warnings: string[] = [];
  const hasIdentifier = hasAny(headers, [
    "student_id",
    "student id",
    "roll no",
    "reg no",
    "admission no",
    "email",
    "phone",
    "student name",
    "name",
  ]);

  if (entityType === "students") {
    return { entityType, format: "roster", supported: true, warnings };
  }

  if (entityType === "teachers") {
    return { entityType, format: "teacher_list", supported: true, warnings };
  }

  if (!hasIdentifier) {
    return {
      entityType,
      format: "unknown",
      supported: false,
      warnings: ["This file has no usable Student Identifier. Add Student ID, email, phone, or student name."],
    };
  }

  if (entityType === "sessions") {
    if (hasAny(headers, ["session_date", "date", "attendance_status", "present", "absent"])) {
      return { entityType, format: "long", supported: true, warnings };
    }
    if (headers.filter(looksLikeDateColumn).length >= 2) {
      return {
        entityType,
        format: "wide",
        supported: false,
        warnings: ["Wide attendance sheets are not supported yet. Use the sessions template with one row per session."],
      };
    }
    if (hasAny(headers, ["total_sessions", "attended_sessions", "attendance_rate", "last_session_date"])) {
      return { entityType, format: "aggregate", supported: true, warnings };
    }
  }

  if (entityType === "payments") {
    if (hasAny(headers, [
      "payment_date", "paid_date", "amount", "payment_status", "status",
      // Common fee-sheet headers: Date / Paid / Total / Balance / fees / tuition.
      "date", "paid", "total", "balance", "total_paid", "amount_paid",
      "fee", "fees", "tuition", "due_date", "method", "remarks",
    ])) {
      return { entityType, format: "transaction", supported: true, warnings };
    }
    if (headers.filter(looksLikeMonthColumn).length >= 2) {
      return {
        entityType,
        format: "monthly_wide",
        supported: false,
        warnings: ["Monthly wide payment sheets are not supported yet. Use the payments template with one row per payment."],
      };
    }
    if (hasAny(headers, ["last_payment_date", "payment_status", "overdue_amount", "unpaid_amount"])) {
      return { entityType, format: "aggregate", supported: true, warnings };
    }
  }

  return {
    entityType,
    format: "unknown",
    supported: false,
    warnings: ["Rakho AI cannot safely detect this file format. Use a downloadable template or add clear text columns."],
  };
}

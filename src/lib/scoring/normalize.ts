import { MappingResult } from "@/lib/matching";
import { CanonicalStudentInput } from "./types";

function asString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function asDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeAttendanceRate(value: unknown): number | null {
  const text = asString(value);
  if (!text) return null;

  if (text.endsWith("%")) {
    const parsed = Number.parseFloat(text.slice(0, -1));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (text.includes("/")) {
    const [attended, total] = text.split("/").map((part) => Number.parseFloat(part));
    return total > 0 ? Math.round((attended / total) * 100) : null;
  }

  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNumber(value: unknown): number | null {
  const text = asString(value);
  if (!text) return null;
  const parsed = Number.parseFloat(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeRows(
  rows: Record<string, unknown>[],
  mappings: MappingResult[]
): CanonicalStudentInput[] {
  const sourceByField = new Map(
    mappings
      .filter((mapping) => mapping.suggestedField)
      .map((mapping) => [mapping.suggestedField, mapping.sourceColumn])
  );

  return rows.flatMap((row, index) => {
    const get = (field: string) => {
      const source = sourceByField.get(field);
      return source ? row[source] : null;
    };
    const name = asString(get("student_name"));
    if (!name) return [];

    return [
      {
        externalId: asString(get("external_id")) ?? `${name.toLowerCase()}-${index}`,
        name,
        contact: asString(get("contact_info")),
        joinDate: asDate(get("join_date")),
        lastSessionDate: asDate(get("last_session_date")),
        attendanceRate: normalizeAttendanceRate(get("attendance_rate")),
        paymentStatus: asString(get("payment_status")),
        lastPaymentDate: asDate(get("last_payment_date")),
        totalSessions: asNumber(get("total_sessions")),
        feesAmount: asNumber(get("fees_amount")),
        subject: asString(get("subject")),
        tutor: asString(get("tutor_assigned")),
        rawData: row,
      },
    ];
  });
}

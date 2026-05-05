import { MappingResult } from "@/lib/matching";
import { CanonicalStudentInput } from "./types";
import {
  normalizeAttendance,
  normalizePaymentStatus,
  normalizeNumeric,
  normalizeDate,
  aiNormalizeAttendance,
  aiNormalizePaymentStatus,
  buildSummary,
  type NormalizationSummary,
} from "./normalizers";

// Legacy export for backward compat
export function normalizeAttendanceRate(value: unknown): number | null {
  return normalizeAttendance(value).value;
}

export type NormalizeRowsResult = {
  students: CanonicalStudentInput[];
  summaries: NormalizationSummary[];
};

export async function normalizeRows(
  rows: Record<string, unknown>[],
  mappings: MappingResult[],
  opts: { academyId?: string | null; uploadId?: string | null } = {}
): Promise<NormalizeRowsResult> {
  const sourceByField = new Map(
    mappings
      .filter((m) => m.suggestedField)
      .map((m) => [m.suggestedField, m.sourceColumn])
  );

  const get = (row: Record<string, unknown>, field: string) => {
    const source = sourceByField.get(field);
    if (!source) return null;
    if (source.includes(" + ")) {
      return source
        .split(" + ")
        .map((part) => String(row[part] ?? "").trim())
        .filter(Boolean)
        .join(" ");
    }
    return row[source];
  };

  // First pass: rule-based normalization, collect unknowns for AI
  type RowIntermediate = {
    index: number;
    row: Record<string, unknown>;
    name: string;
    attendanceRaw: unknown;
    paymentRaw: unknown;
  };

  const intermediates: RowIntermediate[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameStr = String(get(row, "student_name") ?? "").trim();
    if (!nameStr) continue;
    intermediates.push({
      index: i,
      row,
      name: nameStr,
      attendanceRaw: get(row, "attendance_rate"),
      paymentRaw: get(row, "payment_status"),
    });
  }

  // Run rule-based normalizers
  const attendanceResults = intermediates.map((r) => normalizeAttendance(r.attendanceRaw));
  const paymentResults = intermediates.map((r) => normalizePaymentStatus(r.paymentRaw));

  // Collect unknowns for AI
  const unknownAttendance = intermediates
    .filter((_, i) => attendanceResults[i].sourceType === "unknown")
    .map((r) => String(r.attendanceRaw ?? ""));

  const unknownPayment = intermediates
    .filter((_, i) => paymentResults[i].sourceType === "unknown")
    .map((r) => String(r.paymentRaw ?? ""));

  // AI fallback (batched per upload, deduplicated)
  const [aiAttendanceMap, aiPaymentMap] = await Promise.all([
    unknownAttendance.length > 0 ? aiNormalizeAttendance(unknownAttendance, opts) : Promise.resolve({} as Record<string, ReturnType<typeof normalizeAttendance>>),
    unknownPayment.length > 0 ? aiNormalizePaymentStatus(unknownPayment, opts) : Promise.resolve({} as Record<string, ReturnType<typeof normalizePaymentStatus>>),
  ]);

  // Apply AI results
  for (let i = 0; i < intermediates.length; i++) {
    if (attendanceResults[i].sourceType === "unknown") {
      const key = String(intermediates[i].attendanceRaw ?? "");
      if (aiAttendanceMap[key]) attendanceResults[i] = aiAttendanceMap[key];
    }
    if (paymentResults[i].sourceType === "unknown") {
      const key = String(intermediates[i].paymentRaw ?? "");
      if (aiPaymentMap[key]) paymentResults[i] = aiPaymentMap[key];
    }
  }

  // Build canonical student rows
  const students: CanonicalStudentInput[] = intermediates.map((r, i) => ({
    externalId: String(get(r.row, "student_identifier") ?? get(r.row, "external_id") ?? "").trim() || `${r.name.toLowerCase()}-${r.index}`,
    name: r.name,
    contact: String(get(r.row, "contact_info") ?? get(r.row, "phone") ?? get(r.row, "email") ?? "").trim() || null,
    joinDate: normalizeDate(get(r.row, "join_date")).value,
    lastSessionDate: normalizeDate(get(r.row, "last_session_date")).value,
    attendanceRate: attendanceResults[i].value,
    paymentStatus: paymentResults[i].value,
    lastPaymentDate: normalizeDate(get(r.row, "last_payment_date")).value,
    totalSessions: normalizeNumeric(get(r.row, "total_sessions"), false).value,
    feesAmount: normalizeNumeric(get(r.row, "fees_amount") ?? get(r.row, "monthly_fee"), true).value,
    subject: String(get(r.row, "subject") ?? "").trim() || null,
    tutor: String(get(r.row, "tutor_assigned") ?? get(r.row, "teacher_name") ?? "").trim() || null,
    rawData: r.row,
  }));

  // Build summaries for fields that had data
  const summaries: NormalizationSummary[] = [];

  if (sourceByField.has("attendance_rate")) {
    summaries.push(buildSummary("attendance_rate", "Attendance Rate", attendanceResults, (v) => v != null ? `${v}%` : null));
  }
  if (sourceByField.has("payment_status")) {
    summaries.push(buildSummary("payment_status", "Payment Status", paymentResults, (v) => v));
  }

  // Date summaries (lightweight — just track parse failures)
  for (const [field, label] of [
    ["last_session_date", "Last Session Date"],
    ["join_date", "Join Date"],
    ["last_payment_date", "Last Payment Date"],
  ] as const) {
    if (sourceByField.has(field)) {
      const dateResults = intermediates.map((r) => normalizeDate(get(r.row, field)));
      const hasIssues = dateResults.some((d) => d.sourceType !== "iso" && d.sourceType !== "empty");
      if (hasIssues) {
        summaries.push(buildSummary(field, label, dateResults, (v) => v ? v.toISOString().slice(0, 10) : null));
      }
    }
  }

  return { students, summaries };
}

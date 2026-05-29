import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import type { Json } from "@/lib/db/database.types";
import type { MappingResult } from "@/lib/matching";
import type { EntityType, ExistingStudentForMatch, IdentifierSelection, ImportReviewSummary } from "./types";
import { normalizeRows } from "@/lib/scoring/normalize";
import { getOrCreateTutor } from "@/lib/tutors/tutors";
import { matchStudentForImportRow } from "./review";
import { normalizeDate, normalizeNumeric, normalizePaymentStatus } from "@/lib/scoring/normalizers";
import {
  buildStructuredStudentSignals,
  normalizeStructuredAttendanceStatus,
  normalizeStructuredPaymentStatus,
  type StructuredPaymentRow,
  type StructuredSessionRow,
  type StructuredStudentRow,
} from "@/lib/scoring/structured-core";

function sourceByField(mappings: MappingResult[]) {
  return new Map(
    mappings
      .filter((mapping) => mapping.suggestedField)
      .map((mapping) => [mapping.suggestedField as string, mapping.sourceColumn])
  );
}

function get(row: Record<string, unknown>, sources: Map<string, string>, field: string) {
  const source = sources.get(field);
  return source ? row[source] : null;
}

function stringOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

function isMissingColumnError(error: { message?: string } | null): boolean {
  return /column .* does not exist|schema cache|Could not find .* column/i.test(error?.message ?? "");
}

async function insertWithLegacyColumnFallback(table: "Session" | "Payment", payload: Record<string, unknown>, optionalKeys: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from(table).insert(payload);
  if (!error) return;
  if (!isMissingColumnError(error)) throw new Error(`Failed to import ${table.toLowerCase()}: ${error.message}`);

  const legacyPayload = { ...payload };
  for (const key of optionalKeys) delete legacyPayload[key];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: legacyError } = await (db as any).from(table).insert(legacyPayload);
  if (legacyError) throw new Error(`Failed to import ${table.toLowerCase()}: ${legacyError.message}`);
}

async function updateImportSetStatus(importSetId: string | null | undefined, entityType: EntityType, status: string) {
  if (!importSetId) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("ImportSet").update({
    [`${entityType}Status`]: status,
    updatedAt: new Date().toISOString(),
  }).eq("id", importSetId);
}

async function loadStudents(academyId: string): Promise<ExistingStudentForMatch[]> {
  const { data, error } = await db
    .from("Student")
    .select("id, externalId, name, contact")
    .eq("academyId", academyId) as { data: ExistingStudentForMatch[] | null; error: { message: string } | null };
  if (error) throw new Error(`Failed to load students: ${error.message}`);
  return data ?? [];
}

async function syncStructuredStudentSummaries(academyId: string) {
  const { data: students, error: studentsError } = await db
    .from("Student")
    .select("id, name, externalId, contact, subject, tutor, feesAmount, rawDataJson, attendanceRate, lastSessionDate, paymentStatus, lastPaymentDate, totalSessions")
    .eq("academyId", academyId) as { data: StructuredStudentRow[] | null; error: { message: string } | null };
  if (studentsError) throw new Error(`Failed to load students for summary sync: ${studentsError.message}`);

  // Stored summary values already on the Student row (e.g. from an aggregate
  // upload). Preserved when an entity has no event rows to recompute from, so a
  // payments import does not wipe aggregate attendance and vice-versa.
  // The DB select returns extra summary fields not declared on StructuredStudentRow.
  type StudentWithSummary = StructuredStudentRow & {
    attendanceRate?: number | null;
    lastSessionDate?: string | null;
    paymentStatus?: string | null;
    lastPaymentDate?: string | null;
    totalSessions?: number | null;
  };
  const storedById = new Map<string, StudentWithSummary>((students as StudentWithSummary[] ?? []).map((s) => [s.id, s]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions, error: sessionsError } = await (db as any)
    .from("Session")
    .select("studentId, sessionDate, attendanceStatus")
    .eq("academyId", academyId) as { data: StructuredSessionRow[] | null; error: { message: string } | null };
  if (sessionsError) throw new Error(`Failed to load sessions for summary sync: ${sessionsError.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payments, error: paymentsError } = await (db as any)
    .from("Payment")
    .select("studentId, paymentDate, paymentStatus, amount, overdueAmount")
    .eq("academyId", academyId) as { data: StructuredPaymentRow[] | null; error: { message: string } | null };
  if (paymentsError) throw new Error(`Failed to load payments for summary sync: ${paymentsError.message}`);

  const now = new Date().toISOString();
  const canonical = buildStructuredStudentSignals({
    students: students ?? [],
    sessions: sessions ?? [],
    payments: payments ?? [],
  });

  const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  for (const student of canonical) {
    // buildStructuredStudentSignals returns sourceStudentId at the top level.
    const studentId = (student.sourceStudentId ?? student.rawData.sourceStudentId) as string | undefined;
    if (!studentId) continue;

    const stored = storedById.get(studentId);
    const signals = student.rawData.structuredSignals as { countedSessions?: number; paymentRows?: number } | undefined;
    const hasSessions = (signals?.countedSessions ?? 0) > 0;
    const hasPayments = (signals?.paymentRows ?? 0) > 0;

    // Only overwrite an entity's fields when this academy actually has event
    // rows for it; otherwise keep whatever is already stored (e.g. aggregate).
    const attendanceRate = hasSessions ? student.attendanceRate : (typeof stored?.attendanceRate === "number" ? stored.attendanceRate : null);
    const lastSessionDate = hasSessions ? student.lastSessionDate : toDate(stored?.lastSessionDate);
    const totalSessions = hasSessions ? student.totalSessions : (typeof stored?.totalSessions === "number" ? stored.totalSessions : null);
    const paymentStatus = hasPayments ? student.paymentStatus : (stored?.paymentStatus ?? null);
    const lastPaymentDate = hasPayments ? student.lastPaymentDate : toDate(stored?.lastPaymentDate);

    const { error } = await db
      .from("Student")
      .update({
        lastSessionDate: lastSessionDate?.toISOString() ?? null,
        attendanceRate,
        paymentStatus,
        lastPaymentDate: lastPaymentDate?.toISOString() ?? null,
        totalSessions,
        updatedAt: now,
      })
      .eq("id", studentId);
    if (error) throw new Error(`Failed to update student summary fields: ${error.message}`);
  }
}

async function clearStudentDataForAcademy(academyId: string) {
  const students = await loadStudents(academyId);
  const studentIds = students.map((student) => student.id);

  await db.from("EmailAlert").delete().eq("academyId", academyId);
  await db.from("Action").delete().eq("academyId", academyId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("Payment").delete().eq("academyId", academyId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("Session").delete().eq("academyId", academyId);

  if (studentIds.length > 0) {
    await db.from("RiskAssessment").delete().in("studentId", studentIds);
  }

  await db.from("Student").delete().eq("academyId", academyId);
}

// Sibling-merge guard: when a roster has no real student id, normalize.ts
// synthesizes `${name}-${rowIndex}` as the externalId so every row is unique.
// That synthetic id is per-upload only and MUST NOT be used to match existing
// students across uploads (the row index is meaningless between files). We
// detect the pattern here and treat it as "no external id" for cross-upload
// matching, falling back to (contact AND name) / name instead.
const SYNTHETIC_EXTERNAL_ID = /-\d+$/;

function isSyntheticExternalId(externalId: string | null | undefined, name: string): boolean {
  if (!externalId) return false;
  // normalize.ts builds `${name.toLowerCase()}-${index}`.
  return externalId.toLowerCase() === `${name.toLowerCase()}-${externalId.replace(/^.*-/, "")}`
    && SYNTHETIC_EXTERNAL_ID.test(externalId);
}

async function importStudents(args: {
  academyId: string;
  uploadId: string;
  rows: Record<string, unknown>[];
  mappings: MappingResult[];
}) {
  const { students } = await normalizeRows(args.rows, args.mappings, { academyId: args.academyId, uploadId: args.uploadId });
  const existing = await loadStudents(args.academyId);

  // Real (non-synthetic) external ids are globally unique → safe single-id lookup.
  const byExternal = new Map<string, string>();
  // Composite (contact + name) is the only safe phone-based key: two siblings
  // share a phone but differ by name, so keying on contact ALONE would collapse
  // them. Keying on contact+name keeps siblings distinct while still matching a
  // genuinely returning student (same phone AND same name).
  const byContactName = new Map<string, string>();
  // Bare name is a last-resort key. A name shared by >1 existing student is
  // ambiguous, so we mark it null to force an insert rather than guess.
  const byName = new Map<string, string | null>();

  for (const s of existing) {
    if (s.externalId && !isSyntheticExternalId(s.externalId, s.name)) {
      byExternal.set(s.externalId.toLowerCase(), s.id);
    }
    if (s.contact) {
      byContactName.set(`${s.contact.toLowerCase()}|${s.name.toLowerCase()}`, s.id);
    }
    const nameKey = s.name.toLowerCase();
    byName.set(nameKey, byName.has(nameKey) ? null : s.id);
  }

  let updatedRows = 0;
  let newRows = 0;
  for (const student of students) {
    const tutor = await getOrCreateTutor(args.academyId, student.tutor);
    const now = new Date().toISOString();
    // Precedence: real external id → (contact + name) composite → unambiguous name.
    // A bare shared phone with a DIFFERENT name no longer merges siblings.
    const realExternalId =
      student.externalId && !isSyntheticExternalId(student.externalId, student.name)
        ? student.externalId.toLowerCase()
        : null;
    const existingId =
      (realExternalId && byExternal.get(realExternalId)) ||
      (student.contact && byContactName.get(`${student.contact.toLowerCase()}|${student.name.toLowerCase()}`)) ||
      byName.get(student.name.toLowerCase()) ||
      null;

    const payload = {
      academyId: args.academyId,
      uploadId: args.uploadId,
      externalId: student.externalId ?? null,
      name: student.name,
      contact: student.contact ?? null,
      joinDate: student.joinDate?.toISOString() ?? null,
      lastSessionDate: student.lastSessionDate?.toISOString() ?? null,
      attendanceRate: student.attendanceRate ?? null,
      paymentStatus: student.paymentStatus ?? null,
      lastPaymentDate: student.lastPaymentDate?.toISOString() ?? null,
      totalSessions: student.totalSessions ?? null,
      feesAmount: student.feesAmount ?? null,
      subject: student.subject ?? null,
      tutor: student.tutor ?? null,
      tutorId: tutor?.id ?? null,
      rawDataJson: student.rawData as Json,
      updatedAt: now,
    };

    if (existingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("Student").update(payload).eq("id", existingId);
      if (error) throw new Error(`Failed to update student: ${error.message}`);
      updatedRows++;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("Student").insert({
        ...payload,
        id: crypto.randomUUID(),
        createdAt: now,
      });
      if (error) throw new Error(`Failed to insert student: ${error.message}`);
      newRows++;
    }
  }

  return {
    totalRows: args.rows.length,
    readyRows: students.length,
    duplicateRows: updatedRows,
    updatedRows,
    newRows,
    unmatchedRows: 0,
    lowConfidenceRows: 0,
    ignoredRows: args.rows.length - students.length,
  } satisfies ImportReviewSummary;
}

async function importTeachers(args: { academyId: string; rows: Record<string, unknown>[]; mappings: MappingResult[] }) {
  const sources = sourceByField(args.mappings);
  let imported = 0;
  for (const row of args.rows) {
    const name = String(get(row, sources, "teacher_name") ?? "").trim();
    if (!name) continue;
    await getOrCreateTutor(args.academyId, name);
    imported++;
  }
  return {
    totalRows: args.rows.length,
    readyRows: imported,
    duplicateRows: 0,
    updatedRows: 0,
    newRows: imported,
    unmatchedRows: args.rows.length - imported,
    lowConfidenceRows: 0,
    ignoredRows: args.rows.length - imported,
  } satisfies ImportReviewSummary;
}

async function importSessionsOrPayments(args: {
  academyId: string;
  uploadId: string;
  importSetId: string | null;
  entityType: "sessions" | "payments";
  rows: Record<string, unknown>[];
  mappings: MappingResult[];
  identifier: IdentifierSelection;
}) {
  const sources = sourceByField(args.mappings);
  const students = await loadStudents(args.academyId);
  let imported = 0;
  let unmatched = 0;
  let lowConfidence = 0;

  for (const row of args.rows) {
    const match = matchStudentForImportRow(row, students, args.identifier);
    if (match.status === "unmatched" || !match.studentId) {
      unmatched++;
      continue;
    }
    if (match.status === "needs_review" || match.confidence === "low") {
      lowConfidence++;
      continue;
    }

    if (args.entityType === "sessions") {
      const teacherName = String(get(row, sources, "teacher_name") ?? "").trim() || null;
      const teacher = await getOrCreateTutor(args.academyId, teacherName);
      const rawStatus = stringOrNull(get(row, sources, "attendance_status"));
      const attendanceStatus = normalizeStructuredAttendanceStatus(rawStatus);
      await insertWithLegacyColumnFallback("Session", {
        id: crypto.randomUUID(),
        academyId: args.academyId,
        studentId: match.studentId,
        uploadId: args.uploadId,
        importSetId: args.importSetId,
        externalSessionId: stringOrNull(get(row, sources, "session_id")),
        sessionDate: normalizeDate(get(row, sources, "session_date")).value?.toISOString() ?? null,
        attendanceStatus,
        rawStatus,
        isCancelled: attendanceStatus === "cancelled",
        isRescheduled: attendanceStatus === "rescheduled",
        teacherId: teacher?.id ?? null,
        teacherName,
        subject: String(get(row, sources, "subject") ?? "").trim() || null,
        durationMinutes: normalizeNumeric(get(row, sources, "duration_minutes"), true).value,
        rawDataJson: row as Json,
      }, ["externalSessionId", "rawStatus", "isCancelled", "isRescheduled"]);
    } else {
      const rawStatus = stringOrNull(get(row, sources, "payment_status"));
      const status = normalizeStructuredPaymentStatus(rawStatus);
      const dueDate = normalizeDate(get(row, sources, "due_date")).value;
      const paidDate = normalizeDate(get(row, sources, "paid_date")).value;
      const paymentDate = paidDate ?? normalizeDate(get(row, sources, "payment_date")).value ?? normalizeDate(get(row, sources, "last_payment_date")).value;
      await insertWithLegacyColumnFallback("Payment", {
        id: crypto.randomUUID(),
        academyId: args.academyId,
        studentId: match.studentId,
        uploadId: args.uploadId,
        importSetId: args.importSetId,
        externalPaymentId: stringOrNull(get(row, sources, "payment_id")),
        billingMonth: stringOrNull(get(row, sources, "billing_month")),
        dueDate: dueDate?.toISOString() ?? null,
        paidDate: paidDate?.toISOString() ?? null,
        paymentDate: paymentDate?.toISOString() ?? null,
        amount: normalizeNumeric(get(row, sources, "amount"), true).value,
        paymentStatus: status.paymentStatus ?? normalizePaymentStatus(rawStatus).value,
        rawStatus: status.rawStatus,
        isLate: status.isLate || !!(dueDate && paymentDate && paymentDate.getTime() > dueDate.getTime()),
        daysLate: dueDate && paymentDate && paymentDate.getTime() > dueDate.getTime() ? daysBetween(dueDate, paymentDate) : 0,
        overdueAmount: normalizeNumeric(get(row, sources, "overdue_amount"), true).value,
        method: stringOrNull(get(row, sources, "method")),
        rawDataJson: row as Json,
      }, ["externalPaymentId", "billingMonth", "dueDate", "paidDate", "rawStatus", "isLate", "daysLate"]);
    }
    imported++;
  }

  return {
    totalRows: args.rows.length,
    readyRows: imported,
    duplicateRows: 0,
    updatedRows: 0,
    newRows: imported,
    unmatchedRows: unmatched,
    lowConfidenceRows: lowConfidence,
    ignoredRows: unmatched + lowConfidence,
  } satisfies ImportReviewSummary;
}

// A sessions sheet is "aggregate" when it carries pre-summarised attendance
// (rate / total / last date per student) instead of one row per class.
function sessionsAreAggregate(sources: Map<string, string>): boolean {
  const hasEvent = sources.has("session_date") || sources.has("attendance_status");
  const hasAggregate =
    sources.has("attendance_rate") ||
    sources.has("total_sessions") ||
    sources.has("attended_sessions") ||
    sources.has("last_session_date");
  return !hasEvent && hasAggregate;
}

// Aggregate attendance has no per-class rows to count, so write the summary
// fields straight onto the matched Student. The caller skips the session sync
// (which recomputes from Session rows) so these values are not clobbered.
async function importAggregateSessions(args: {
  academyId: string;
  uploadId: string;
  rows: Record<string, unknown>[];
  mappings: MappingResult[];
  identifier: IdentifierSelection;
}): Promise<ImportReviewSummary> {
  const sources = sourceByField(args.mappings);
  const students = await loadStudents(args.academyId);
  const now = new Date().toISOString();
  let imported = 0;
  let unmatched = 0;
  let lowConfidence = 0;

  for (const row of args.rows) {
    const match = matchStudentForImportRow(row, students, args.identifier);
    if (match.status === "unmatched" || !match.studentId) {
      unmatched++;
      continue;
    }
    if (match.status === "needs_review" || match.confidence === "low") {
      lowConfidence++;
      continue;
    }

    const attendanceRate = normalizeNumeric(get(row, sources, "attendance_rate"), true).value;
    const lastSessionDate = normalizeDate(get(row, sources, "last_session_date")).value;
    const totalSessions =
      normalizeNumeric(get(row, sources, "total_sessions"), true).value ??
      normalizeNumeric(get(row, sources, "attended_sessions"), true).value;

    const update: Record<string, unknown> = { updatedAt: now };
    if (attendanceRate != null) update.attendanceRate = Math.round(attendanceRate);
    if (lastSessionDate) update.lastSessionDate = lastSessionDate.toISOString();
    if (totalSessions != null) update.totalSessions = Math.round(totalSessions);

    // Only counts as imported if the row actually carried a summary value.
    if (Object.keys(update).length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("Student").update(update).eq("id", match.studentId);
      if (error) throw new Error(`Failed to update student attendance summary: ${error.message}`);
      imported++;
    } else {
      unmatched++;
    }
  }

  return {
    totalRows: args.rows.length,
    readyRows: imported,
    duplicateRows: 0,
    updatedRows: imported,
    newRows: 0,
    unmatchedRows: unmatched,
    lowConfidenceRows: lowConfidence,
    ignoredRows: unmatched + lowConfidence,
  } satisfies ImportReviewSummary;
}

export async function processStructuredUpload(
  uploadId: string,
  academyId: string,
  mode: "update" | "replace" = "update"
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upload, error } = await (db as any)
    .from("Upload")
    .select("*")
    .eq("id", uploadId)
    .single();
  if (error || !upload || upload.academyId !== academyId) throw new Error("Upload not found");

  const entityType = (upload.entityType ?? "students") as EntityType;
  const rows = (upload.rawRowsJson as Record<string, unknown>[] | null) ?? [];
  const mappings = (upload.mappingJson as MappingResult[] | null) ?? [];
  const importSetId = upload.importSetId as string | null;

  let summary: ImportReviewSummary;
  if (entityType === "students") {
    if (mode === "replace") {
      await clearStudentDataForAcademy(academyId);
    }
    summary = await importStudents({ academyId, uploadId, rows, mappings });
  } else if (entityType === "teachers") {
    summary = await importTeachers({ academyId, rows, mappings });
  } else {
    const identifier = upload.identifierJson as IdentifierSelection | null;
    if (!identifier) throw new Error("Student Identifier is required for sessions and payments");

    const sources = sourceByField(mappings);
    const aggregateSessions = entityType === "sessions" && sessionsAreAggregate(sources);

    if (mode === "replace" && !aggregateSessions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deleteQuery = (db as any).from(entityType === "sessions" ? "Session" : "Payment").delete().eq("academyId", academyId);
      deleteQuery = importSetId ? deleteQuery.eq("importSetId", importSetId) : deleteQuery.eq("uploadId", uploadId);
      await deleteQuery;
    }

    if (aggregateSessions) {
      // Aggregate attendance is written straight to Student; no Session rows,
      // so we deliberately skip the per-event summary sync.
      summary = await importAggregateSessions({ academyId, uploadId, rows, mappings, identifier });
    } else {
      summary = await importSessionsOrPayments({
        academyId,
        uploadId,
        importSetId,
        entityType,
        rows,
        mappings,
        identifier,
      });
      await syncStructuredStudentSummaries(academyId);
    }
  }

  const status = summary.unmatchedRows > 0 || summary.lowConfidenceRows > 0 ? "reviewed" : "imported";
  await updateImportSetStatus(importSetId, entityType, status);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("Upload").update({
    status: "PROCESSED",
    reviewJson: summary as unknown as Json,
    processedAt: new Date().toISOString(),
    rowCount: summary.readyRows,
  }).eq("id", uploadId);

  return { status, summary };
}

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

async function updateImportSetStatus(importSetId: string | null | undefined, entityType: EntityType, status: string) {
  if (!importSetId) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("ImportSet").update({
    [`${entityType}Status`]: status,
    updatedAt: new Date().toISOString(),
  }).eq("id", importSetId);
}

async function loadStudents(academyId: string): Promise<ExistingStudentForMatch[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("Student")
    .select("id, externalId, name, contact")
    .eq("academyId", academyId) as { data: ExistingStudentForMatch[] | null; error: { message: string } | null };
  if (error) throw new Error(`Failed to load students: ${error.message}`);
  return data ?? [];
}

async function syncStructuredStudentSummaries(academyId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: students, error: studentsError } = await (db as any)
    .from("Student")
    .select("id, name, externalId, contact, subject, tutor, feesAmount, rawDataJson")
    .eq("academyId", academyId) as { data: StructuredStudentRow[] | null; error: { message: string } | null };
  if (studentsError) throw new Error(`Failed to load students for summary sync: ${studentsError.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions, error: sessionsError } = await (db as any)
    .from("Session")
    .select("studentId, sessionDate, attendanceStatus, rawStatus")
    .eq("academyId", academyId) as { data: StructuredSessionRow[] | null; error: { message: string } | null };
  if (sessionsError) throw new Error(`Failed to load sessions for summary sync: ${sessionsError.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payments, error: paymentsError } = await (db as any)
    .from("Payment")
    .select("studentId, paymentDate, paymentStatus, rawStatus, isLate, amount, overdueAmount")
    .eq("academyId", academyId) as { data: StructuredPaymentRow[] | null; error: { message: string } | null };
  if (paymentsError) throw new Error(`Failed to load payments for summary sync: ${paymentsError.message}`);

  const now = new Date().toISOString();
  const canonical = buildStructuredStudentSignals({
    students: students ?? [],
    sessions: sessions ?? [],
    payments: payments ?? [],
  });

  for (const student of canonical) {
    const studentId = student.rawData.sourceStudentId as string | undefined;
    if (!studentId) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("Student")
      .update({
        lastSessionDate: student.lastSessionDate?.toISOString() ?? null,
        attendanceRate: student.attendanceRate,
        paymentStatus: student.paymentStatus,
        lastPaymentDate: student.lastPaymentDate?.toISOString() ?? null,
        totalSessions: student.totalSessions,
        updatedAt: now,
      })
      .eq("id", studentId);
    if (error) throw new Error(`Failed to update student summary fields: ${error.message}`);
  }
}

async function clearStudentDataForAcademy(academyId: string) {
  const students = await loadStudents(academyId);
  const studentIds = students.map((student) => student.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("EmailAlert").delete().eq("academyId", academyId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("Action").delete().eq("academyId", academyId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("Payment").delete().eq("academyId", academyId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("Session").delete().eq("academyId", academyId);

  if (studentIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("RiskAssessment").delete().in("studentId", studentIds);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("Student").delete().eq("academyId", academyId);
}

async function importStudents(args: {
  academyId: string;
  uploadId: string;
  rows: Record<string, unknown>[];
  mappings: MappingResult[];
}) {
  const { students } = await normalizeRows(args.rows, args.mappings, { academyId: args.academyId, uploadId: args.uploadId });
  const existing = await loadStudents(args.academyId);
  const byExternal = new Map(existing.filter((s) => s.externalId).map((s) => [s.externalId!.toLowerCase(), s.id]));
  const byContact = new Map(existing.filter((s) => s.contact).map((s) => [s.contact!.toLowerCase(), s.id]));
  const byName = new Map(existing.map((s) => [s.name.toLowerCase(), s.id]));

  let updatedRows = 0;
  let newRows = 0;
  for (const student of students) {
    const tutor = await getOrCreateTutor(args.academyId, student.tutor);
    const now = new Date().toISOString();
    const existingId =
      (student.externalId && byExternal.get(student.externalId.toLowerCase())) ||
      (student.contact && byContact.get(student.contact.toLowerCase())) ||
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("Session").insert({
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
      });
      if (error) throw new Error(`Failed to import session: ${error.message}`);
    } else {
      const rawStatus = stringOrNull(get(row, sources, "payment_status"));
      const status = normalizeStructuredPaymentStatus(rawStatus);
      const dueDate = normalizeDate(get(row, sources, "due_date")).value;
      const paidDate = normalizeDate(get(row, sources, "paid_date")).value;
      const paymentDate = paidDate ?? normalizeDate(get(row, sources, "payment_date")).value;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("Payment").insert({
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
      });
      if (error) throw new Error(`Failed to import payment: ${error.message}`);
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
    if (mode === "replace") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deleteQuery = (db as any).from(entityType === "sessions" ? "Session" : "Payment").delete().eq("academyId", academyId);
      deleteQuery = importSetId ? deleteQuery.eq("importSetId", importSetId) : deleteQuery.eq("uploadId", uploadId);
      await deleteQuery;
    }
    const identifier = upload.identifierJson as IdentifierSelection | null;
    if (!identifier) throw new Error("Student Identifier is required for sessions and payments");
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

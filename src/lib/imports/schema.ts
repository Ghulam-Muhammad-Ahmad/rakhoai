import type { EntityType } from "./types";

export type ImportField = {
  value: string;
  label: string;
  desc: string;
  identifier?: boolean;
};

export const IMPORT_FIELDS: Record<EntityType, ImportField[]> = {
  students: [
    { value: "student_identifier", label: "Student ID / Roll No / Reg No", desc: "Recommended stable ID across every file.", identifier: true },
    { value: "student_name", label: "Student Name", desc: "Required for roster display." },
    { value: "phone", label: "Phone", desc: "Useful for contact and medium-confidence matching.", identifier: true },
    { value: "email", label: "Email", desc: "Useful for contact and medium-confidence matching.", identifier: true },
    { value: "subject", label: "Subject / Course", desc: "Groups students by class or program." },
    { value: "teacher_name", label: "Teacher Name", desc: "Links to teacher analytics when available." },
    { value: "monthly_fee", label: "Monthly Fee", desc: "Used as fallback revenue context." },
    { value: "join_date", label: "Join Date", desc: "Enrollment date." },
    { value: "notes", label: "Notes", desc: "Free-text context." },
  ],
  teachers: [
    { value: "teacher_name", label: "Teacher Name", desc: "Required teacher/tutor name." },
    { value: "teacher_id", label: "Teacher ID", desc: "Optional teacher/record ID for your reference." },
    { value: "phone", label: "Phone", desc: "Teacher contact." },
    { value: "email", label: "Email", desc: "Teacher email." },
    { value: "subject", label: "Subject", desc: "Primary subject or class." },
  ],
  sessions: [
    { value: "student_identifier", label: "Student ID / Roll No / Reg No", desc: "Best way to link sessions to students.", identifier: true },
    { value: "student_name", label: "Student Name", desc: "Low-confidence fallback identifier.", identifier: true },
    { value: "phone", label: "Phone", desc: "Medium-confidence fallback identifier.", identifier: true },
    { value: "email", label: "Email", desc: "Medium-confidence fallback identifier.", identifier: true },
    { value: "session_id", label: "Session ID", desc: "Optional row/session identifier." },
    { value: "session_date", label: "Session Date", desc: "Date of the class or attendance row." },
    { value: "attendance_status", label: "Attendance Status", desc: "Present, absent, late, or attended." },
    { value: "teacher_name", label: "Teacher Name", desc: "Optional teacher link." },
    { value: "subject", label: "Subject", desc: "Optional subject or class." },
    { value: "duration_minutes", label: "Duration", desc: "Session length in minutes, if available." },
    { value: "total_sessions", label: "Total Sessions", desc: "Aggregate format total." },
    { value: "attended_sessions", label: "Attended Sessions", desc: "Aggregate format attended count." },
    { value: "attendance_rate", label: "Attendance Rate", desc: "Aggregate format attendance percentage." },
    { value: "last_session_date", label: "Last Session Date", desc: "Aggregate format latest session date." },
  ],
  payments: [
    { value: "student_identifier", label: "Student ID / Roll No / Reg No", desc: "Best way to link payments to students.", identifier: true },
    { value: "student_name", label: "Student Name", desc: "Low-confidence fallback identifier.", identifier: true },
    { value: "phone", label: "Phone", desc: "Medium-confidence fallback identifier.", identifier: true },
    { value: "email", label: "Email", desc: "Medium-confidence fallback identifier.", identifier: true },
    { value: "payment_id", label: "Payment ID", desc: "Optional payment or invoice identifier." },
    { value: "billing_month", label: "Billing Month", desc: "Month this payment applies to." },
    { value: "due_date", label: "Due Date", desc: "Expected payment due date." },
    { value: "paid_date", label: "Paid Date", desc: "Date payment was received." },
    { value: "payment_date", label: "Payment Date", desc: "Date payment was made." },
    { value: "amount", label: "Amount", desc: "Payment amount." },
    { value: "payment_status", label: "Payment Status", desc: "Paid, unpaid, overdue, pending." },
    { value: "overdue_amount", label: "Overdue Amount", desc: "Outstanding balance." },
    { value: "method", label: "Payment Method", desc: "Cash, card, bank transfer, or other method." },
    { value: "last_payment_date", label: "Last Payment Date", desc: "Aggregate format latest payment." },
  ],
};

export function getImportFields(entityType: EntityType): ImportField[] {
  return IMPORT_FIELDS[entityType];
}

export function getRequiredField(entityType: EntityType): string {
  if (entityType === "teachers") return "teacher_name";
  return entityType === "students" ? "student_name" : "student_identifier";
}

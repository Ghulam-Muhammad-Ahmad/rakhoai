import type { EntityType } from "./types";

const TEMPLATES: Record<EntityType, string[]> = {
  students: ["student_id", "student_name", "phone", "email", "subject", "teacher_name", "monthly_fee"],
  teachers: ["teacher_name", "phone", "email", "subject"],
  sessions: ["student_id", "session_date", "attendance_status", "teacher_name"],
  payments: ["student_id", "payment_date", "amount", "payment_status"],
};

export function getCsvTemplate(entityType: EntityType): string {
  const headers = TEMPLATES[entityType];
  return `${headers.join(",")}\n`;
}

export function getTemplateHeaders(entityType: EntityType): string[] {
  return TEMPLATES[entityType];
}

import Fuse from "fuse.js";

const SCHEMA_FIELDS = [
  { field: "student_identifier", terms: ["student id", "roll no", "reg no", "admission no", "student code"] },
  { field: "student_name", terms: ["student name", "student_name", "name", "full name", "pupil name", "learner name"] },
  { field: "contact_info", terms: ["contact info", "contact_info", "contact number", "whatsapp"] },
  { field: "email", terms: ["email", "email address", "student email"] },
  { field: "phone", terms: ["phone", "mobile", "phone number", "parent phone"] },
  { field: "join_date", terms: ["join date", "join_date", "enrollment date", "start date", "date joined", "admission date"] },
  { field: "last_session_date", terms: ["last session date", "last_session_date", "last session", "last attendance", "last class", "last present"] },
  { field: "attendance_rate", terms: ["attendance rate", "attendance_rate", "attendance", "attendance percent", "attendance %", "presence rate"] },
  { field: "last_payment_date", terms: ["last payment date", "last_payment_date", "last payment", "last paid"] },
  { field: "payment_status", terms: ["payment status", "payment_status", "fee status", "paid status", "payment state"] },
  { field: "total_sessions", terms: ["total sessions", "total_sessions", "session count", "sessions", "total classes", "class count"] },
  { field: "attended_sessions", terms: ["attended sessions", "classes attended", "present count"] },
  { field: "fees_amount", terms: ["fees amount", "fees_amount", "fees", "fee", "monthly fee", "tuition fee", "tuition"] },
  { field: "monthly_fee", terms: ["monthly fee", "tuition fee", "fees amount"] },
  { field: "subject", terms: ["subject", "course", "course name", "class", "topic", "grade"] },
  { field: "tutor_assigned", terms: ["tutor assigned", "tutor_assigned", "tutor", "teacher", "instructor", "assigned tutor"] },
  { field: "teacher_name", terms: ["teacher name", "tutor name", "teacher", "tutor", "instructor"] },
  { field: "notes", terms: ["notes", "note", "remarks", "comments", "observations"] },
  { field: "session_date", terms: ["session date", "class date", "attendance date"] },
  { field: "session_id", terms: ["session id", "class id", "attendance id"] },
  { field: "attendance_status", terms: ["attendance status", "present absent", "present", "absent", "status"] },
  { field: "duration_minutes", terms: ["duration", "duration minutes", "session duration", "minutes"] },
  { field: "payment_date", terms: ["payment date", "paid date", "date paid"] },
  { field: "payment_id", terms: ["payment id", "invoice id", "receipt id", "transaction id"] },
  { field: "billing_month", terms: ["billing month", "fee month", "month"] },
  { field: "due_date", terms: ["due date", "payment due date", "fee due date"] },
  { field: "paid_date", terms: ["paid date", "date paid", "received date"] },
  { field: "amount", terms: ["amount", "amount paid", "payment amount", "paid amount"] },
  { field: "overdue_amount", terms: ["overdue amount", "unpaid amount", "balance", "due amount"] },
  { field: "method", terms: ["method", "payment method", "payment mode"] },
];

type FuseEntry = { term: string; field: string };

function entriesFor(allowedFields?: readonly string[]): FuseEntry[] {
  const allowed = allowedFields ? new Set(allowedFields) : null;
  return SCHEMA_FIELDS
    .filter(({ field }) => !allowed || allowed.has(field))
    .flatMap(({ field, terms }) => terms.map((term) => ({ term, field })));
}

function scoreToConfidence(fuseScore: number): number {
  return Math.max(0.6, 0.95 - fuseScore * 0.875);
}

export function fuzzyMatch(
  column: string,
  allowedFields?: readonly string[]
): { field: string; confidence: number } | null {
  const fuse = new Fuse(entriesFor(allowedFields), {
    keys: ["term"],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
  });
  const results = fuse.search(column);
  if (!results.length) return null;

  const best = results[0];
  const score = best.score ?? 1;
  if (score > 0.4) return null;

  return {
    field: best.item.field,
    confidence: scoreToConfidence(score),
  };
}

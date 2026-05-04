import Fuse from "fuse.js";

const SCHEMA_FIELDS = [
  { field: "student_name", terms: ["student name", "student_name", "name", "full name", "pupil name", "learner name"] },
  { field: "contact_info", terms: ["contact info", "contact_info", "email", "phone", "mobile", "contact number", "whatsapp"] },
  { field: "join_date", terms: ["join date", "join_date", "enrollment date", "start date", "date joined", "admission date"] },
  { field: "last_session_date", terms: ["last session date", "last_session_date", "last session", "last attendance", "last class", "last present"] },
  { field: "attendance_rate", terms: ["attendance rate", "attendance_rate", "attendance", "attendance percent", "attendance %", "presence rate"] },
  { field: "last_payment_date", terms: ["last payment date", "last_payment_date", "last payment", "last paid", "payment date", "date paid"] },
  { field: "payment_status", terms: ["payment status", "payment_status", "fee status", "paid status", "payment state"] },
  { field: "total_sessions", terms: ["total sessions", "total_sessions", "session count", "sessions", "total classes", "class count"] },
  { field: "fees_amount", terms: ["fees amount", "fees_amount", "fees", "amount", "fee", "monthly fee", "tuition fee", "tuition"] },
  { field: "subject", terms: ["subject", "course", "course name", "class", "topic", "grade"] },
  { field: "tutor_assigned", terms: ["tutor assigned", "tutor_assigned", "tutor", "teacher", "instructor", "assigned tutor"] },
  { field: "notes", terms: ["notes", "note", "remarks", "comments", "observations"] },
];

type FuseEntry = { term: string; field: string };

const entries: FuseEntry[] = SCHEMA_FIELDS.flatMap(({ field, terms }) =>
  terms.map((term) => ({ term, field }))
);

const fuse = new Fuse(entries, {
  keys: ["term"],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
});

function scoreToConfidence(fuseScore: number): number {
  // Fuse score: 0 = perfect, 1 = worst. Map 0→0.95, 0.4→0.6
  return Math.max(0.6, 0.95 - fuseScore * 0.875);
}

export function fuzzyMatch(
  column: string
): { field: string; confidence: number } | null {
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

import assert from "node:assert/strict";

const identifiers = await import("../src/lib/imports/identifiers.ts");
const formats = await import("../src/lib/imports/formats.ts");
const review = await import("../src/lib/imports/review.ts");
const dateField = await import("../src/lib/scoring/normalizers/dateField.ts");
const matchingGuardrails = await import("../src/lib/matching/guardrails.ts");

assert.equal(identifiers.getIdentifierQuality("Student ID").level, "high");
assert.equal(identifiers.getIdentifierQuality("Roll No").level, "high");
assert.equal(identifiers.getIdentifierQuality("row number").level, "invalid");
assert.match(identifiers.getIdentifierQuality("Parent Phone").warning, /siblings/i);
assert.match(identifiers.getIdentifierQuality("Student Name").warning, /Risky/i);

assert.equal(identifiers.normalizePhone("+92 (300) 123-4567"), "3001234567");
assert.equal(identifiers.normalizeEmail("  ALI@EXAMPLE.COM "), "ali@example.com");
assert.equal(identifiers.normalizeName("  Ali   Hassan "), "ali hassan");

assert.deepEqual(
  formats.detectImportFormat("sessions", ["student_id", "session_date", "attendance_status"]).format,
  "long"
);
assert.deepEqual(
  formats.detectImportFormat("sessions", ["student_id", "2026-05-01", "2026-05-03"]).format,
  "wide"
);
assert.equal(
  formats.detectImportFormat("sessions", ["student_id", "2026-05-01", "2026-05-03"]).supported,
  false
);
assert.deepEqual(
  formats.detectImportFormat("sessions", ["student_id", "total_sessions", "attendance_rate"]).format,
  "aggregate"
);
assert.deepEqual(
  formats.detectImportFormat("payments", ["student_id", "payment_date", "amount", "payment_status"]).format,
  "transaction"
);
assert.deepEqual(
  formats.detectImportFormat("payments", ["student_id", "Jan 2026", "Feb 2026"]).format,
  "monthly_wide"
);
assert.equal(
  formats.detectImportFormat("payments", ["student_id", "Jan 2026", "Feb 2026"]).supported,
  false
);
assert.equal(
  formats.detectImportFormat("sessions", ["student_name", "red", "green"]).supported,
  false
);

const students = [
  { id: "s1", externalId: "ST-001", name: "Ali Hassan", contact: "ali@example.com" },
  { id: "s2", externalId: "ST-002", name: "Maya Khan", contact: "+92 300 111 2222" },
  { id: "s3", externalId: null, name: "Noor Khan", contact: "+92 300 111 2222" },
];

assert.equal(
  review.matchStudentForImportRow({ student_id: "ST-001" }, students, {
    sourceColumn: "student_id",
    targetField: "student_identifier",
    quality: identifiers.getIdentifierQuality("student_id"),
  }).studentId,
  "s1"
);

assert.equal(
  review.matchStudentForImportRow({ email: "ALI@EXAMPLE.COM" }, students, {
    sourceColumn: "email",
    targetField: "email",
    quality: identifiers.getIdentifierQuality("email"),
  }).confidence,
  "medium"
);

assert.equal(
  review.matchStudentForImportRow({ phone: "03001112222" }, students, {
    sourceColumn: "phone",
    targetField: "phone",
    quality: identifiers.getIdentifierQuality("phone"),
  }).status,
  "needs_review"
);

assert.equal(
  review.matchStudentForImportRow({ name: "Ali Hassan" }, students, {
    sourceColumn: "name",
    targetField: "student_name",
    quality: identifiers.getIdentifierQuality("name"),
  }).confidence,
  "low"
);

assert.equal(
  review.matchStudentForImportRow({ student_id: "UNKNOWN" }, students, {
    sourceColumn: "student_id",
    targetField: "student_identifier",
    quality: identifiers.getIdentifierQuality("student_id"),
  }).status,
  "unmatched"
);

const dmy = dateField.normalizeDate("05/04/2026").value;
assert.equal(dmy.getFullYear(), 2026);
assert.equal(dmy.getMonth(), 3);
assert.equal(dmy.getDate(), 5);

const guardedSessionMappings = matchingGuardrails.applyMappingGuardrails([
  { sourceColumn: "StudentID", sampleValues: ["ST-1"], suggestedField: "student_identifier", confidence: 1, layer: "exact" },
  { sourceColumn: "SessionID", sampleValues: ["SES-1"], suggestedField: "last_session_date", confidence: 0.82, layer: "fuzzy" },
  { sourceColumn: "Subject", sampleValues: ["Math"], suggestedField: "subject", confidence: 1, layer: "exact" },
  { sourceColumn: "Grade", sampleValues: ["Grade 8"], suggestedField: "subject", confidence: 1, layer: "exact" },
], "sessions");

assert.equal(
  guardedSessionMappings.find((mapping) => mapping.sourceColumn === "SessionID").suggestedField,
  null
);
assert.equal(
  guardedSessionMappings.find((mapping) => mapping.sourceColumn === "Subject").suggestedField,
  "subject"
);
assert.equal(
  guardedSessionMappings.find((mapping) => mapping.sourceColumn === "Grade").suggestedField,
  null
);

const guardedPaymentMappings = matchingGuardrails.applyMappingGuardrails([
  { sourceColumn: "StudentID", sampleValues: ["ST-1"], suggestedField: "student_identifier", confidence: 1, layer: "exact" },
  { sourceColumn: "PaymentID", sampleValues: ["PAY-1"], suggestedField: "last_payment_date", confidence: 0.8, layer: "fuzzy" },
], "payments");
assert.equal(
  guardedPaymentMappings.find((mapping) => mapping.sourceColumn === "PaymentID").suggestedField,
  null
);

const fullNameMappings = matchingGuardrails.applyMappingGuardrails([
  { sourceColumn: "FirstName", sampleValues: ["Sara"], suggestedField: null, confidence: 0, layer: "unmapped" },
  { sourceColumn: "LastName", sampleValues: ["Khan"], suggestedField: null, confidence: 0, layer: "unmapped" },
], "students");
assert.equal(
  fullNameMappings.find((mapping) => mapping.sourceColumn === "FirstName + LastName").suggestedField,
  "student_name"
);

console.log("structured import tests passed");

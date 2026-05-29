import assert from "node:assert/strict";

const core = await import("../src/lib/scoring/structured-core.ts");

const students = [
  { id: "s1", name: "Ali", externalId: "ST-1", contact: null, subject: "Math", tutor: "Ms Sara", feesAmount: 12000, rawDataJson: {} },
  { id: "s2", name: "Maya", externalId: "ST-2", contact: null, subject: "English", tutor: null, feesAmount: 9000, rawDataJson: {} },
];

const sessions = [
  { studentId: "s1", sessionDate: "2026-05-01T00:00:00.000Z", attendanceStatus: "present" },
  { studentId: "s1", sessionDate: "2026-05-03T00:00:00.000Z", attendanceStatus: "absent" },
  { studentId: "s1", sessionDate: "2026-05-04T00:00:00.000Z", attendanceStatus: "cancelled" },
  { studentId: "s1", sessionDate: "2026-05-05T00:00:00.000Z", attendanceStatus: "rescheduled" },
  { studentId: "s2", sessionDate: "2026-04-01T00:00:00.000Z", attendanceStatus: "absent" },
];

const payments = [
  { studentId: "s1", paymentDate: "2026-05-02T00:00:00.000Z", paymentStatus: "paid", amount: 12000, overdueAmount: 0 },
  { studentId: "s2", paymentDate: "2026-03-20T00:00:00.000Z", paymentStatus: "overdue", amount: 9000, overdueAmount: 9000 },
];

const canonical = core.buildStructuredStudentSignals({
  students,
  sessions,
  payments,
  now: new Date("2026-05-05T00:00:00.000Z"),
});

assert.equal(canonical[0].totalSessions, 2);
assert.equal(canonical[0].sourceStudentId, "s1");
assert.equal(canonical[0].attendanceRate, 50);
assert.equal(canonical[0].lastSessionDate?.toISOString(), "2026-05-03T00:00:00.000Z");
assert.equal(canonical[0].rawData.structuredSignals.cancelledSessions, 1);
assert.equal(canonical[0].rawData.structuredSignals.rescheduledSessions, 1);
assert.equal(canonical[0].paymentStatus, "paid");
assert.equal(canonical[1].paymentStatus, "overdue");
assert.equal(canonical[1].lastSessionDate?.toISOString(), "2026-04-01T00:00:00.000Z");

const confidence = core.getStructuredRiskConfidence({
  hasStudentIdentifier: true,
  hasSessions: true,
  hasPayments: true,
  latestDataAt: new Date("2026-05-02T00:00:00.000Z"),
  now: new Date("2026-05-05T00:00:00.000Z"),
});
assert.equal(confidence.level, "high");

const stale = core.getStructuredRiskConfidence({
  hasStudentIdentifier: false,
  hasSessions: true,
  hasPayments: false,
  latestDataAt: new Date("2026-03-01T00:00:00.000Z"),
  now: new Date("2026-05-05T00:00:00.000Z"),
});
assert.equal(stale.level, "low");

const missingPaymentConfidence = core.getStructuredRiskConfidence({
  hasStudentIdentifier: true,
  hasSessions: true,
  hasPayments: false,
  latestDataAt: new Date("2026-05-02T00:00:00.000Z"),
  now: new Date("2026-05-05T00:00:00.000Z"),
});
assert.equal(missingPaymentConfidence.level, "medium");
assert.match(missingPaymentConfidence.label, /payment data missing/i);

const latePayment = core.normalizeStructuredPaymentStatus("Paid (Late)");
assert.equal(latePayment.paymentStatus, "paid");
assert.equal(latePayment.rawStatus, "Paid (Late)");
assert.equal(latePayment.isLate, true);

console.log("structured risk tests passed");

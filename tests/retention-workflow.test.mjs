import assert from "node:assert/strict";

const riskCore = await import("../src/lib/students/risk-core.ts");
const actionCore = await import("../src/lib/actions/action-core.ts");
const alertCore = await import("../src/lib/alerts/high-risk-core.ts");

const now = new Date("2026-05-04T12:00:00.000Z");

assert.equal(
  riskCore.selectLatestRisk([
    { id: "old", computedAt: "2026-05-01T00:00:00.000Z", riskScore: 90, riskBand: "HIGH" },
    { id: "new", computedAt: "2026-05-03T00:00:00.000Z", riskScore: 60, riskBand: "MEDIUM" },
  ])?.id,
  "new"
);

const rows = [
  {
    id: "s1",
    name: "Ayaan Khan",
    contact: "ayaan@example.com",
    tutor: "Imran",
    subject: "Math",
    feesAmount: 120,
    lastSessionDate: "2026-04-12T00:00:00.000Z",
    latestRisk: { riskBand: "HIGH", riskScore: 92, reasonsJson: ["Missed classes"], recommendedAction: "Call parent", confidence: 0.9, computedAt: "2026-05-01T00:00:00.000Z" },
  },
  {
    id: "s2",
    name: "Maya Reyes",
    contact: "maya@example.com",
    tutor: "Sara",
    subject: "English",
    feesAmount: 80,
    lastSessionDate: "2026-04-28T00:00:00.000Z",
    latestRisk: { riskBand: "MEDIUM", riskScore: 66, reasonsJson: ["Attendance dip"], recommendedAction: "Check in", confidence: 0.75, computedAt: "2026-05-02T00:00:00.000Z" },
  },
  {
    id: "s3",
    name: "Noor Ali",
    contact: "noor@example.com",
    tutor: "Imran",
    subject: "Science",
    feesAmount: 200,
    lastSessionDate: "2026-05-01T00:00:00.000Z",
    latestRisk: { riskBand: "LOW", riskScore: 20, reasonsJson: [], recommendedAction: "No action", confidence: 0.8, computedAt: "2026-05-02T00:00:00.000Z" },
  },
];

assert.deepEqual(
  riskCore.filterAndSortStudentRiskRows(rows, {
    band: "AT_RISK",
    tutor: "Imran",
    sort: "riskScore",
    direction: "desc",
  }).map((row) => row.id),
  ["s1"]
);

assert.deepEqual(
  riskCore.filterAndSortStudentRiskRows(rows, {
    sort: "feesAmount",
    direction: "asc",
  }).map((row) => row.id),
  ["s2", "s1", "s3"]
);

assert.equal(actionCore.isTerminalActionStatus("DONE"), true);
assert.equal(actionCore.isTerminalActionStatus("IN_PROGRESS"), false);
assert.equal(
  actionCore.buildActionStatusUpdate({ status: "DONE", notes: "Called parent" }, now).takenAt,
  "2026-05-04T12:00:00.000Z"
);
assert.equal(
  actionCore.buildActionStatusUpdate({ status: "IN_PROGRESS" }, now).takenAt,
  undefined
);

assert.equal(
  riskCore.selectLatestActionStatus([
    { id: "old", status: "PENDING", createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" },
    { id: "new", status: "STUDENT_SAVED", createdAt: "2026-05-02T00:00:00.000Z", updatedAt: "2026-05-03T00:00:00.000Z" },
  ]),
  "STUDENT_SAVED"
);

assert.equal(
  alertCore.shouldQueueHighRiskAlert({ riskBand: "HIGH" }),
  true
);
assert.equal(
  alertCore.shouldQueueHighRiskAlert({ riskBand: "MEDIUM" }),
  false
);
assert.equal(alertCore.getQueuedHighRiskAlertStatus(), "QUEUED");

const alert = alertCore.buildHighRiskEmailAlert({
  academyName: "Bright Future Academy",
  studentName: "Ayaan Khan",
  riskScore: 92,
  reasons: ["Hasn't attended in 18 days", "Payment overdue"],
  recommendedAction: "Call parent today",
});

assert.equal(alert.subject, "High-risk student alert: Ayaan Khan");
assert.match(alert.body, /Bright Future Academy/);
assert.match(alert.body, /Risk score: 92\/100/);
assert.match(alert.body, /Call parent today/);

console.log("retention workflow tests passed");

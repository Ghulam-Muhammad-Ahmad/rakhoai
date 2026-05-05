import assert from "node:assert/strict";

const table = await import("../src/lib/imports/table-format.ts");

assert.equal(table.formatDateLabel("2026-05-01T00:00:00.000Z"), "1 May 2026");
assert.equal(table.formatDateLabel(null), "Not set");
assert.equal(table.formatCurrencyAmount("12000", "Rs"), "Rs12,000");
assert.equal(table.formatCurrencyAmount(null, "Rs"), "Not set");
assert.equal(table.formatAttendanceStatus("present").tone, "success");
assert.equal(table.formatAttendanceStatus("absent").tone, "danger");
assert.equal(table.formatPaymentStatus("overdue").tone, "danger");
assert.equal(table.formatPaymentStatus("paid").tone, "success");

console.log("entity table format tests passed");

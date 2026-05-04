import assert from "node:assert/strict";

function revenueAtRisk(rows) {
  return rows
    .filter((row) => row.riskBand === "HIGH")
    .reduce((sum, row) => sum + row.feesAmount, 0);
}

assert.equal(
  revenueAtRisk([
    { riskBand: "HIGH", feesAmount: 49 },
    { riskBand: "MEDIUM", feesAmount: 79 },
  ]),
  49
);

console.log("dashboard summary tests passed");

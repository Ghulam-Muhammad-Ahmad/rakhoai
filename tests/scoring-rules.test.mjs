import assert from "node:assert/strict";

function band(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

assert.equal(band(82), "HIGH");
assert.equal(band(55), "MEDIUM");
assert.equal(band(20), "LOW");

console.log("scoring rules tests passed");

import assert from "node:assert/strict";

function normalizeAttendance(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (text.endsWith("%")) return Number.parseFloat(text.slice(0, -1));
  if (text.includes("/")) {
    const [attended, total] = text.split("/").map(Number);
    return total > 0 ? Math.round((attended / total) * 100) : null;
  }
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

assert.equal(normalizeAttendance("85%"), 85);
assert.equal(normalizeAttendance("17/20"), 85);
assert.equal(normalizeAttendance("bad"), null);

console.log("scoring normalize tests passed");

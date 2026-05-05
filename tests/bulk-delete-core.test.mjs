import assert from "node:assert/strict";

const bulkDeleteCore = await import("../src/lib/deletions/bulk-delete-core.ts");

assert.deepEqual(
  bulkDeleteCore.normalizeDeleteIds([" s1 ", "", "s1", 42, null, "s2"]),
  ["s1", "s2"]
);

assert.deepEqual(
  bulkDeleteCore.normalizeDeleteNames([" Sara Khan ", "sara khan", "", "Imran Ali", undefined]),
  ["Sara Khan", "Imran Ali"]
);

assert.equal(
  bulkDeleteCore.isBulkDeleteTarget("students"),
  true
);
assert.equal(
  bulkDeleteCore.isBulkDeleteTarget("uploads"),
  false
);

assert.deepEqual(
  bulkDeleteCore.buildDeleteResult("students", ["s1", "s2"], ["s2"]),
  { target: "students", requested: 2, deleted: 1, missing: ["s1"] }
);

console.log("bulk delete core tests passed");

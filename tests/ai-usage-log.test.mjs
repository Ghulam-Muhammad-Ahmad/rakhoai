import assert from "node:assert/strict";
import crypto from "node:crypto";

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

const payload = { feature: "risk_scoring", rows: 12 };

assert.equal(hashPayload(payload).length, 64);
assert.notEqual(hashPayload(payload), hashPayload({ feature: "risk_scoring", rows: 13 }));

console.log("ai usage log hash tests passed");

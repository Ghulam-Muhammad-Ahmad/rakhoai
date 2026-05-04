import assert from "node:assert/strict";

function nextUploadStatusAfterMap({ autoProcess }) {
  return autoProcess ? "PROCESSING" : "MAPPED";
}

function confirmButtonLabel(state) {
  if (state === "saving") return "Saving mapping...";
  if (state === "processing") return "Scoring students...";
  return "Confirm mapping";
}

assert.equal(nextUploadStatusAfterMap({ autoProcess: false }), "MAPPED");
assert.equal(nextUploadStatusAfterMap({ autoProcess: true }), "PROCESSING");
assert.equal(confirmButtonLabel("idle"), "Confirm mapping");
assert.equal(confirmButtonLabel("saving"), "Saving mapping...");
assert.equal(confirmButtonLabel("processing"), "Scoring students...");

console.log("upload processing state tests passed");

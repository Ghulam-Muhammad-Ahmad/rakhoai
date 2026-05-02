import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("src/app/onboarding/layout.tsx", "utf8");

assert.match(layout, /createClient/);
assert.match(layout, /redirect\(["']\/login["']\)/);
assert.match(layout, /signOut/);
assert.match(layout, /fullName/);
assert.match(layout, /Sign out/);
assert.match(layout, /user\.email/);

console.log("onboarding authenticated header verified");

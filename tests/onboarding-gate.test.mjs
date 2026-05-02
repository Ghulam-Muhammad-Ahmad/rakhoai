import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("src/app/(dashboard)/layout.tsx", "utf8");

assert.match(layout, /from ['"]next\/navigation['"]/);
assert.match(layout, /redirect\(['"]\/onboarding['"]\)/);
assert.match(layout, /academy:\s*true/);

assert.match(layout, /DashboardShell/);
assert.doesNotMatch(layout, /^["']use client["'];?/);

console.log("onboarding dashboard gate verified");

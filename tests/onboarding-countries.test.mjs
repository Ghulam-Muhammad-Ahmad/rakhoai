import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/onboarding/page.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

assert.match(page, /from ["']world-countries["']/);
assert.doesNotMatch(page, /COUNTRY_CURRENCY/);
assert.match(page, /countryOptions/);
assert.equal(packageJson.dependencies["world-countries"], "^5.1.0");

console.log("global onboarding country list verified");

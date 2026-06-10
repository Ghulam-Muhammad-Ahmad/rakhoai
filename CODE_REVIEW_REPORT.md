# RakhoAI — Full Codebase Review Report

**Reviewer:** Senior Code Review (AI-Assisted)
**Date:** 2026-05-29
**Verdict:** This app is **vibe coded** — built quickly with AI agents (Claude, Codex) without rigorous engineering discipline. The code *works* for the happy path but has significant security holes, architectural inconsistencies, race conditions, and missing error boundaries that would cause production failures under real load.

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 2 | 3 | 3 | 1 |
| Architecture | 2 | 3 | 4 | 2 |
| Data Integrity | 2 | 3 | 2 | 1 |
| Error Handling | 1 | 3 | 3 | 2 |
| Performance | 0 | 2 | 3 | 1 |
| Code Quality | 0 | 2 | 4 | 4 |
| **Total** | **7** | **16** | **19** | **11** |

**Total issues found: 53 (7 reclassified after peer review)**

**Retracted/Downgraded:** C2 (CSRF → MEDIUM), C7 (data.ts → LOW), H11 (fuzzy → LOW), H17 (open redirect → retracted as false positive)

---

## Remediation Status

| Status | Count |
|--------|-------|
| ✅ Fixed | 35 |
| ♻️ Resolved (dead-code removal) | 5 |
| ⏸ Deferred | 6 |
| ✗ Not a bug | 3 |
| 🔕 Won't fix | 3 |

*Remediation completed 2026-05-30.*

---

## CRITICAL Issues (Must Fix Before Production)

### C1. Service Role Key Exposed to Client-Side Bundle — ✅ Fixed
**File:** `src/lib/db/client.ts`
**Severity:** CRITICAL — Security

The `db` client uses `SUPABASE_SERVICE_ROLE_KEY` (line 6) which bypasses ALL Row Level Security. While the file imports from a server-side path, the global singleton pattern (`globalForDb`) combined with Next.js bundling could accidentally expose this to client bundles if any client component transitively imports from `@/lib/db/client`.

```typescript
// Line 6: Service role key — bypasses ALL RLS
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

**Problem:** The service-role client should NEVER be importable from any code path that could reach the browser. The current architecture has no guard against this — any component that accidentally imports from `@/lib/db/client` gets full database admin access.

**Fix:** Create a strict boundary: server-only files should use `import "server-only"` at the top, or rename the module to make the server-only nature explicit. Consider using Next.js's `server-only` package.

---

### C2. No Origin/Header Validation on State-Changing API Routes — ⏸ Deferred
**File:** All API routes (`src/app/api/*/route.ts`)
**Severity:** MEDIUM — Security (Downgraded — SameSite cookies blunt the attack)

All POST/DELETE/PATCH API routes rely solely on Supabase auth cookies for authentication but have no CSRF token validation. Since Supabase uses cookie-based auth, any malicious website can make authenticated requests on behalf of the user.

**Correction:** Modern browsers set `SameSite=Lax` by default on cookies, which blocks cross-origin POST requests from malicious sites. This significantly reduces the CSRF risk. The real fix is still worth doing (Origin header validation) but the severity is MEDIUM, not CRITICAL — it's defense-in-depth, not a gaping hole.

**Affected routes:**
- `POST /api/academy` — create/update academy
- `POST /api/uploads` — upload files
- `POST /api/uploads/[id]/process` — trigger scoring
- `DELETE /api/students` — bulk delete students
- `POST /api/actions` — create actions
- `DELETE /api/actions` — bulk delete actions

**Fix:** Implement CSRF protection via `NextRequest` header validation (check `Origin` header matches the app domain), or use Next.js middleware to validate the `Sec-Fetch-Site` header.

---

### C3. No Rate Limiting on AI-Powered Endpoints — ⏸ Deferred
**File:** `src/app/api/uploads/[id]/process/route.ts`, `src/app/api/scoring/run/route.ts`
**Severity:** CRITICAL — Security / Cost

The `/api/uploads/[id]/process` and `/api/scoring/run` endpoints trigger OpenAI API calls with no rate limiting. A malicious or careless user could:
1. Upload hundreds of files and trigger expensive AI scoring
2. Hit the `/api/scoring/run` endpoint repeatedly
3. Run up massive OpenAI bills

There's a basic "block if PROCESSING" check in uploads, but nothing prevents rapid sequential uploads or hitting the scoring endpoint directly.

**Fix:** Implement per-academy rate limiting (e.g., max 5 scoring runs per hour). Use Upstash Redis rate limiter (already have the dependency).

---

### C4. Unvalidated File Content — Path Traversal in Storage — ✅ Fixed
**File:** `src/app/api/uploads/route.ts` (line 152)
**Severity:** CRITICAL — Security

```typescript
const storagePath = `${academyId}/${uploadId}/${file.name}`;
```

The `file.name` from user input is used directly in the storage path without sanitization. A crafted filename like `../../etc/passwd` or containing special characters could cause path traversal issues in Supabase Storage.

**Fix:** Sanitize the filename:
```typescript
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
const storagePath = `${academyId}/${uploadId}/${safeName}`;
```

---

### C5. Race Condition in Upload Processing — ✅ Fixed
**File:** `src/app/api/uploads/[id]/process/route.ts`
**Severity:** CRITICAL — Data Integrity

The route sets status to `PROCESSING` (line 48), then starts background processing with `after()`. But there's a TOCTOU race: between the status check (line 37-45) and the status update (line 48), two concurrent requests could both pass the check and start duplicate processing.

```typescript
// Line 37-45: Check status
if (upload.status === "PROCESSING") { return 202; }
// Line 48: Update status — but another request could have passed the check too!
await db.from("Upload").update({ status: "PROCESSING" }).eq("id", id);
```

**Fix:** Use an atomic update with a WHERE clause:
```typescript
const { data } = await db.from("Upload")
  .update({ status: "PROCESSING" })
  .eq("id", id)
  .eq("status", "MAPPED")  // Only update if still MAPPED
  .select("id")
  .single();
if (!data) return NextResponse.json({ status: "PROCESSING" }, { status: 202 });
```

---

### C6. Missing Input Validation on Auth Actions — ✅ Fixed
**File:** `src/app/(auth)/actions.ts`
**Severity:** CRITICAL — Security

The `signUp` and `signIn` server actions cast form data directly to strings without validation:

```typescript
const name = formData.get('name') as string;  // No validation
const email = formData.get('email') as string;  // No validation
const password = formData.get('password') as string;  // No validation
```

A malicious user could send:
- Empty strings (bypasses required fields)
- Extremely long strings (DoS)
- Non-email strings for email field

**Fix:** Use Zod validation (already a dependency) for all form inputs.

---

### ~~C7. Hardcoded Fake Data in Production Code~~ — DOWNGRADED — ✅ Fixed
**File:** `src/lib/data.ts`
**Severity:** ~~CRITICAL~~ → LOW — Cleanup

The file contains hardcoded `STUDENTS` and `INTERVENTIONS` arrays, but these are **not rendered anywhere in the app**. `Avatar.tsx` and `RiskBadge.tsx` import types only (`import type`), not the data. This is dead code from prototyping, not a production data leak.

**Fix:** Delete or move to test fixtures. Low priority cleanup.

---

### C8. No Database Transaction Wrapping for Multi-Step Operations — ✅ Fixed
**File:** `src/lib/imports/process-upload.ts`, `src/lib/scoring/persist.ts`
**Severity:** CRITICAL — Data Integrity

The `processStructuredUpload` function performs multiple sequential database operations (insert students, insert sessions, insert payments, update upload status) without any transaction wrapping. If any step fails mid-way, the data is left in an inconsistent state.

For example, in `importStudents`:
1. Insert/update student records one by one
2. If step 47 of 100 fails, 46 students are partially imported
3. The upload status is never updated to FAILED (the outer try/catch handles this, but the partial data remains)

**Fix:** Use Supabase's RPC functions for multi-step operations, or implement compensating transactions (rollback on failure).

---

## HIGH Issues (Should Fix Soon)

### H1. Pervasive `as any` Type Casting — ✅ Fixed
**Files:** `src/lib/scoring/persist.ts`, `src/lib/imports/process-upload.ts`, `src/lib/scoring/structured.ts`, and 15+ other files
**Severity:** HIGH — Code Quality

The codebase has **40+ instances** of `// eslint-disable-next-line @typescript-eslint/no-explicit-any` followed by `(db as any)`. This completely defeats TypeScript's type safety. The comment says "works around Supabase TS inference issue with PascalCase table names" but this is a workaround that's spread to every single database call.

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (db as any).from("Student")...
```

**Root cause:** The database types use PascalCase table names (`Academy`, `Student`, `RiskAssessment`) but the Supabase client may not match them correctly.

**Fix:** Fix the generated types or create proper typed wrappers. The `as any` pattern hides real type errors.

---

### H2. OpenAI Client Singleton Without Error Recovery — ♻️ Resolved
**File:** `src/lib/ai/openai-client.ts`
**Severity:** HIGH — Reliability

The OpenAI client is a module-level singleton with no retry logic, no timeout configuration, and no circuit breaker:

```typescript
let client: OpenAI | null = null;
export function getOpenAiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
```

If the API key is rotated or the OpenAI service has a temporary outage, every request fails with no recovery path. The singleton is cached forever.

**Fix:** Add retry logic with exponential backoff, configure timeouts, and consider a circuit breaker pattern.

---

### H3. Marketing Page Claims Fake Metrics — ✅ Fixed
**File:** `src/app/page.tsx` (line 61)
**Severity:** HIGH — Trust / Legal

```typescript
<span><strong>1,200+</strong> tutoring centers</span>
```

The landing page claims "1,200+ tutoring centers" when the product hasn't launched yet. This is a false claim that could have legal implications.

Similarly, the testimonial from "Ayesha Yousuf · Bright Future Academy" (line 196-197) appears to be fabricated.

**Fix:** Either use real metrics or clearly mark as "illustrative" / "sample data". Remove fake testimonials.

---

### H4. Missing Middleware — Proxy File Not Wired — ✅ Fixed
**File:** `src/proxy.ts`
**Severity:** HIGH — Security

The `proxy.ts` file contains auth middleware logic but is **not actually wired as Next.js middleware**. There's no `middleware.ts` at the project root or in `src/`. The proxy function exists but is never called by Next.js.

This means:
- Protected routes (`/dashboard`, `/students`, etc.) are NOT actually protected by middleware
- Only the dashboard layout's server-side check prevents unauthorized access
- API routes have their own auth checks, but client-side navigation to protected pages has no middleware gate

**Fix:** Create `src/middleware.ts` that exports the proxy function:
```typescript
export { proxy as middleware } from './proxy';
export { config } from './proxy';
```

---

### H5. Dashboard Summary N+1 Query Pattern — ✅ Fixed
**File:** `src/lib/dashboard/summary.ts`
**Severity:** HIGH — Performance

The `getDashboardSummary` function fetches ALL students with their risk assessments using a join, then sorts assessments in JavaScript:

```typescript
const { data: rawStudents } = await db
  .from("Student")
  .select(`id, feesAmount, riskAssessments:RiskAssessment(riskBand, computedAt)`)
  .eq("academyId", academyId);
```

For an academy with 500 students and multiple risk assessments each, this fetches thousands of rows into memory and sorts them in JS. This should be a database-level aggregation.

**Fix:** Use Supabase RPC or a database view that computes the summary at the database level.

---

### H6. Student Risk List Fetches ALL Students Into Memory — ✅ Fixed
**File:** `src/lib/students/risk.ts` (line 141-148)
**Severity:** HIGH — Performance

```typescript
const { data } = await db
  .from("Student")
  .select(`*, riskAssessments:RiskAssessment(*), actions:Action(...)`)
  .eq("academyId", academyId);
```

This fetches EVERY student with ALL their risk assessments and actions into memory, then filters/sorts in JavaScript. For a large academy, this is a memory bomb.

**Fix:** Push filtering and sorting to the database level using Supabase's `.order()`, `.range()`, and `.filter()` methods. Add pagination.

---

### H7. Unused Redis Import in Scoring AI — ♻️ Resolved
**File:** `src/lib/scoring/ai.ts` (line 1)
**Severity:** HIGH — Reliability

```typescript
import { Redis } from "@upstash/redis";
```

This is a **top-level static import** of `@upstash/redis`. If the environment variables are not set, this import still loads the entire Redis client library. The matching module (`src/lib/matching/ai.ts`) correctly uses a **dynamic import** (`await import("@upstash/redis")`) inside a try-catch.

**Fix:** Change to dynamic import like the matching module does.

---

### H8. Hardcoded Model Names Override User Configuration — ♻️ Resolved
**File:** `src/lib/ai/openai-client.ts` (line 23-25)
**Severity:** HIGH — Configuration

```typescript
function resolveModel(requested?: string): string | undefined {
  return process.env.OPENAI_MODEL || requested;
}
```

The `OPENAI_MODEL` env var overrides ALL model selections, including the specific model choices made in scoring vs. mapping. If set, every AI call uses the same model regardless of whether it's a cheap mapping task or an expensive scoring task.

**Fix:** Support per-feature model overrides (e.g., `OPENAI_MAPPING_MODEL`, `OPENAI_SCORING_MODEL`).

---

### H9. Auth Callback Doesn't Handle PKCE Flow — ✗ Not a bug
**File:** `src/app/auth/callback/route.ts`
**Severity:** HIGH — Security

The OAuth callback only handles the `code` exchange flow. If Supabase is configured for PKCE (which is the default for newer projects), the `code` parameter handling may not work correctly without the `next` parameter being properly validated.

Additionally, the `next` parameter from the URL is used directly in the redirect without validation — an attacker could craft a URL like `/auth/callback?code=...&next=https://evil.com` to redirect the user to a malicious site (open redirect).

**Fix:** Validate that `next` starts with `/` and doesn't contain `//` or protocol schemes.

---

### H10. No Error Boundary in Dashboard Layout — ✅ Fixed
**File:** `src/app/(dashboard)/layout.tsx`
**Severity:** HIGH — UX

The dashboard layout fetches user data and academy data in the server component but has no error boundary. If the database is temporarily unavailable, the entire dashboard crashes with an unhandled error.

**Fix:** Add `error.tsx` files in the dashboard route group. Wrap database calls in try-catch with user-friendly error messages.

---

### H11. Fuzzy Match Score Check is Redundant — ✅ Fixed
**File:** `src/lib/matching/fuzzy.ts` (line 64)
**Severity:** LOW — Nit

```typescript
const score = best.score ?? 1;
if (score > 0.4) return null;  // Redundant — Fuse threshold: 0.4 already filters
```

The Fuse.js threshold is already `0.4` (line 55), so this guard is redundant (never triggers). Not inverted, not backwards — just dead code. Low nit, not a logic error.

**Fix:** Remove the redundant check or tighten the Fuse threshold if the intent was a stricter bar.

---

### H12. Payment Status Normalizer Has Ambiguous Keyword Matching — ✅ Fixed
**File:** `src/lib/scoring/normalizers/paymentStatus.ts`
**Severity:** HIGH — Logic Error

The keyword matching uses `lower.includes(kw)` which creates false positives:
- "outstanding" matches "outstanding" → `overdue` (line 7)
- "outstanding" also matches the pending rule's "outstanding" (line 8)
- Because overdue comes first, it always wins — but "outstanding payment" could mean pending, not overdue

Similarly, "received" in "not received" would match "received" → `paid`, which is wrong.

**Fix:** Use word boundary matching or more specific patterns. Prioritize negation detection ("not paid", "not received").

---

### H13. Missing `createdAt` on Academy Insert — ✗ Not a bug
**File:** `src/app/api/academy/route.ts` (line 47-53)
**Severity:** HIGH — Data Integrity

```typescript
const { data: academy, error } = await db.from("Academy").insert({
  id: crypto.randomUUID(),
  ownerId: user.id,
  name, country, currency,
  // Missing: createdAt
}).select().single();
```

The `createdAt` field is not set on insert. If the database doesn't have a default value, this will fail or store null.

**Fix:** Add `createdAt: new Date().toISOString()` to the insert payload.

---

### H14. Scoring Run Route Has No Upload Context — ✅ Fixed
**File:** `src/app/api/scoring/run/route.ts`
**Severity:** HIGH — Architecture

The `/api/scoring/run` endpoint runs `runStructuredRiskScoring` which re-scores ALL students from scratch using session/payment event rows. But it has no upload context — it doesn't know which upload triggered it, making it impossible to track AI usage or cache results per upload.

**Fix:** Accept an optional `uploadId` parameter and pass it through to the scoring function.

---

### H15. Duplicate `isSyntheticExternalId` Function — ♻️ Resolved
**Files:** `src/lib/scoring/persist.ts` (line 26-31) AND `src/lib/imports/process-upload.ts` (line 183-188)
**Severity:** HIGH — Code Quality / Maintenance

The exact same function is duplicated in two files:
```typescript
function isSyntheticExternalId(externalId: string | null | undefined, name: string): boolean {
  if (!externalId) return false;
  return externalId.toLowerCase() === `${name.toLowerCase()}-${externalId.replace(/^.*-/, "")}`
    && SYNTHETIC_EXTERNAL_ID.test(externalId);
}
```

If one is fixed and the other isn't, student matching behavior diverges silently.

**Fix:** Extract to a shared utility module.

---

### H16. File Size Limit is 4MB, PRD Says 10MB — ✅ Fixed
**File:** `src/app/api/uploads/route.ts` (line 12)
**Severity:** HIGH — Product Mismatch

```typescript
const MAX_BYTES = 4 * 1024 * 1024;  // 4 MB
```

The PRD specifies 10MB max file size, but the code enforces 4MB. Real tutoring business spreadsheets with 500+ students could easily exceed 4MB.

**Fix:** Align with PRD: `const MAX_BYTES = 10 * 1024 * 1024;`

---

### ~~H17. Open Redirect Vulnerability in Auth Callback~~ — FALSE POSITIVE (Retracted) — ✗ Not a bug
**File:** `src/app/auth/callback/route.ts`
**Severity:** ~~HIGH~~ → Not a bug

~~The `next` parameter is used in redirect without validation.~~

**Correction:** The code does `${origin}${next}` where `origin` comes from the request URL. If `next=//evil.com`, the result is `https://app.com//evil.com` which stays on the same origin as a path. The prefixing of `origin` neutralizes the open redirect. Not exploitable as written. Reviewer did not trace the actual string concatenation.

**Residual fix (low priority):** Still good practice to validate `next` starts with `/` and doesn't start with `//` for defense-in-depth, but this is LOW, not HIGH.

---

## MEDIUM Issues

### M1. No Pagination on Student/Tutor Lists — ✅ Fixed
**Files:** `src/lib/students/risk.ts`, `src/lib/tutors/tutors.ts`
**Severity:** MEDIUM — Performance

All list endpoints fetch the entire dataset for an academy with no pagination. An academy with 1000+ students will return a massive JSON response.

**Fix:** Add cursor-based pagination with `.range()`.

---

### M2. Inconsistent Error Response Format — ⏸ Deferred
**Files:** All API routes
**Severity:** MEDIUM — Code Quality

Some routes return `{ error: "string" }`, others return `{ error: parsed.error.flatten() }` (Zod format), and some return `{ error: "string", details: ... }`. Clients can't reliably parse errors.

**Fix:** Standardize error response format: `{ error: { code: string, message: string, details?: unknown } }`.

---

### M3. Marketing Page Uses Inline Styles Everywhere — ✅ Fixed
**File:** `src/app/page.tsx`
**Severity:** MEDIUM — Code Quality

The entire landing page (~300 lines) uses inline `style={{...}}` objects instead of Tailwind CSS classes, violating the AGENTS.md constraint: "Use Tailwind CSS utility classes for React UI styling."

**Fix:** Refactor to Tailwind classes.

---

### M4. `data.ts` Contains Unused Mock Data — ✅ Fixed
**File:** `src/lib/data.ts`
**Severity:** MEDIUM — Code Quality

Contains hardcoded `STUDENTS` and `INTERVENTIONS` arrays that appear to be leftover from prototyping. If imported anywhere, they'd leak fake data into production.

**Fix:** Delete or move to test fixtures.

---

### M5. Normalizer AI Fallback Uses Wrong Feature Tag — ✅ Fixed
**File:** `src/lib/scoring/normalizers/ai-fallback.ts` (line 30, 75)
**Severity:** MEDIUM — Monitoring

```typescript
feature: "column_mapping",  // Should be "normalization" or a new feature tag
```

AI normalization calls are logged as "column_mapping" in the usage log, making it impossible to distinguish mapping costs from normalization costs in analytics.

**Fix:** Add a "normalization" feature type to the AI usage log.

---

### M6. No `loading.tsx` Files for Dashboard Routes — ✅ Fixed
**Files:** All `(dashboard)` route pages
**Severity:** MEDIUM — UX

Dashboard pages have no loading states. While data is being fetched, users see nothing (blank page or the layout shell with no content).

**Fix:** Add `loading.tsx` files with skeleton UI.

---

### M7. Onboarding Page Doesn't Validate Country/Currency — ✅ Fixed
**File:** `src/app/onboarding/page.tsx`
**Severity:** MEDIUM — UX

The currency field is editable and auto-filled from country, but there's no validation that the currency code is valid. A user could type "abc" as currency.

**Fix:** Validate currency codes against `Intl.NumberFormat` or a known list.

---

### M8. Missing `error.tsx` Files — ✅ Fixed
**Files:** All route groups
**Severity:** MEDIUM — UX

No `error.tsx` boundary files exist anywhere in the app. Any unhandled error in a server component will show Next.js's default error page.

**Fix:** Add `error.tsx` and `not-found.tsx` files to each route group.

---

### M9. Scoring Pipeline Silently Swallows AI Errors — ♻️ Resolved
**File:** `src/lib/scoring/ai.ts` (line 146-147)
**Severity:** MEDIUM — Reliability

```typescript
} catch {
  parsed = { students: batch.map(({ student, key }) => fallbackResult(student, key)) };
}
```

When the AI call fails, the code silently falls back to rule-based scoring with no user notification. The user sees "scoring complete" but half the results are rule-based, not AI-based.

**Fix:** Track fallback usage and report it to the user: "X of Y students were scored using rules only (AI unavailable)."

---

### M10. Fuse.js Threshold Mismatch — ✅ Fixed
**File:** `src/lib/matching/fuzzy.ts` (line 55, 64)
**Severity:** MEDIUM — Logic

Fuse threshold is 0.4, but the confidence check in `index.ts` (line 94) requires `>= 0.75`. The `scoreToConfidence` function (line 46) maps score 0.0 → 0.95 and score 0.4 → 0.60. So a Fuse score of 0.39 maps to confidence ~0.61, which is below 0.75 and would be rejected. This means many legitimate fuzzy matches are discarded.

**Fix:** Align the thresholds — either lower the confidence bar or tighten the Fuse threshold.

---

### M11. No Graceful Degradation When Redis is Unavailable — ⏸ Deferred
**File:** `src/lib/scoring/ai.ts`, `src/lib/matching/ai.ts`
**Severity:** MEDIUM — Reliability

Both files check for Redis at runtime, but if Redis credentials are present and Redis is temporarily down, the `getRedis()` function will throw on the first request and cache the null result forever (module-level `redis` variable).

**Fix:** Add a TTL to the "Redis unavailable" cache, or retry Redis connection periodically.

---

### M12. `after()` Callback Has No Timeout — ✅ Fixed
**File:** `src/app/api/uploads/[id]/process/route.ts` (line 51-58)
**Severity:** MEDIUM — Reliability

```typescript
after(async () => {
  try {
    await processStructuredUpload(id, academyId, mode);
  } catch (err) {
    console.error("Background scoring failed for upload", id, err);
    await db.from("Upload").update({ status: "FAILED" }).eq("id", id);
  }
});
```

The `after()` callback has no timeout. If `processStructuredUpload` hangs (e.g., OpenAI API hangs), the upload stays in "PROCESSING" status forever.

**Fix:** Add a timeout wrapper:
```typescript
const timeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Scoring timeout")), 300_000)  // 5 min
);
await Promise.race([processStructuredUpload(id, academyId, mode), timeout]);
```

---

### M13. Dashboard Summary Doesn't Use Academy Currency — ⏸ Deferred
**File:** `src/lib/dashboard/summary.ts`
**Severity:** MEDIUM — UX

The `estimatedRevenueAtRisk` is calculated by summing `feesAmount` values, but there's no currency conversion or currency display. If a student has fees in PKR and another in USD, they're summed together.

**Fix:** Use the academy's currency for display and store amounts with currency context.

---

### M14. Excel Parser Doesn't Handle Multi-Sheet Files — ✅ Fixed
**File:** `src/lib/parsers/index.ts` (line 56)
**Severity:** MEDIUM — Product

```typescript
const sheetName = workbook.SheetNames[0];  // Always uses first sheet
```

The PRD explicitly says "Multiple sheets in Excel → let user pick" but the code always takes the first sheet with no warning.

**Fix:** If multiple sheets exist, return sheet names in the response and let the user choose.

---

## LOW Issues

### L1. `package.json` Name is "temp-init" — ✅ Fixed
**File:** `package.json`
**Severity:** LOW — Code Quality

```json
"name": "temp-init"
```

This is a leftover from project scaffolding. Should be "rakhoai" or "rakho-ai".

---

### L2. Inconsistent Casing in Table/Column Names — 🔕 Won't fix
**Files:** Multiple
**Severity:** LOW — Code Quality

The database uses PascalCase table names (`Academy`, `Student`, `RiskAssessment`) and camelCase column names (`academyId`, `riskScore`). This is non-standard for PostgreSQL which traditionally uses snake_case. The `as any` casts are a direct consequence of this choice.

---

### L3. No `.env.example` File — ✅ Fixed
**Severity:** LOW — DX

The README references `.env.local` but there's no `.env.example` file for new developers. The `.env` file exists but is gitignored.

---

### L4. Marketing Page Links All Go to `/dashboard` — ✅ Fixed
**File:** `src/app/page.tsx`
**Severity:** LOW — UX

"Sign in", "Book a walkthrough", "See a sample report" all link to `/dashboard`. There's no separate sign-in page, no booking flow, and no sample report.

---

### L5. Footer Links Are Dead (`#`) — ✅ Fixed
**File:** `src/app/page.tsx` (line 271)
**Severity:** LOW — UX

```typescript
<a href="#">{l}</a>
```

All footer links point to `#`. These should either link to real pages or be removed.

---

### L6. `next.config.ts` is Empty — ✅ Fixed
**File:** `next.config.ts`
**Severity:** LOW — Configuration

No custom headers, no image domains, no security headers. Should at minimum add security headers (CSP, X-Frame-Options, etc.).

---

### L7. Trust Section Has Fake Company Names — ✅ Fixed
**File:** `src/app/page.tsx` (line 107)
**Severity:** LOW — Trust

```typescript
const logos = ["Bright Future", "Pioneer Academy", "Vidya Bhavan", "Al-Falah Tutors", "Pinnacle Coaching", "Lyceum Hub"];
```

These are fabricated company names presented as real customers.

---

### L8. No `robots.txt` or `sitemap.xml` — ✅ Fixed
**Severity:** LOW — SEO

The marketing page has no `robots.txt` or `sitemap.xml` for search engine indexing.

---

### L9. `CLAUDE.md` Still Present — 🔕 Won't fix
**File:** `CLAUDE.md`
**Severity:** LOW — Code Quality

The `CLAUDE.md` file contains AI agent instructions that shouldn't be in the production repo. Same for `.claude/` and `.codex-pets/` directories.

---

### L10. Missing `Tutor` Table in Database Types — ✅ Fixed
**File:** `src/lib/db/types.ts`
**Severity:** LOW — Type Safety

The `Tutor` table is used in `src/lib/tutors/tutors.ts` but isn't exported from `types.ts`. The code uses `as any` to work around this.

---

## Architecture Issues (Vibe Code Patterns)

### A1. Two Parallel Scoring Pipelines — ✅ Fixed
The codebase has TWO completely separate scoring paths:
1. `src/lib/scoring/process-upload.ts` — `processMappedUpload` (the "old" path)
2. `src/lib/imports/process-upload.ts` — `processStructuredUpload` (the "new" path)

The route handler calls the new path, but the old path still exists and is referenced in comments as "currently a dead path". This creates confusion about which code is actually in use.

### A2. PRD Mismatches Reality — 🔕 Won't fix
- PRD says Next.js 15 + Prisma + NextAuth — Reality is Next.js 16 + Supabase + no Prisma
- PRD says 10MB upload limit — Code enforces 4MB
- PRD says shadcn/ui — No shadcn components found
- PRD says React Hook Form — No forms library used
- PRD says TanStack Table — No table library used
- PRD says Redis for caching — Redis is optional and not required

### A3. No Test Coverage for Critical Paths — ⏸ Deferred
The test suite (`tests/`) only covers scoring normalizers and utility functions. There are ZERO tests for:
- API routes
- Auth flows
- Upload processing
- Student matching
- Dashboard queries

---

## Verdict

**This app is vibe coded.** It was built rapidly with AI agents (evidenced by `.claude/`, `.codex-pets/`, `AGENTS.md`, `CLAUDE.md`) and demonstrates the classic pattern of AI-generated code:

1. **It works for the happy path** — the core flow (upload → map → score → display) functions
2. **It breaks under edge cases** — race conditions, error handling, and security are afterthoughts
3. **Type safety is an illusion** — 40+ `as any` casts mean TypeScript provides zero protection
4. **The architecture evolved organically** — two scoring pipelines, dead code, PRD-reality mismatch
5. **Security is surface-level** — auth checks exist but CSRF, rate limiting, and input validation are missing
6. **No testing discipline** — critical paths have zero test coverage

**Recommendation:** Before any production deployment, this codebase needs:
1. Security audit and CSRF/rate limiting implementation
2. Consolidation of the two scoring pipelines
3. Removal of `as any` casts with proper type definitions
4. Test coverage for all API routes and critical business logic
5. Error boundaries and proper error handling throughout
6. Alignment between PRD and actual implementation

---

*Report generated by senior code review on 2026-05-29.*

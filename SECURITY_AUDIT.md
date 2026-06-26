# 🔴 Security Audit Report — RakhOAi

**Project**: Next.js 16 + Supabase student risk management dashboard  
**Audit Date**: June 23, 2026  
**Severity Scale**: 🔴 Critical → 🟠 High → 🟡 Medium → 🟢 Low → ℹ️ Info

---

## 🔴 CRITICAL — SERVICE_ROLE_KEY Used for ALL Database Access

**File**: `src/lib/db/client.ts` (line 7)  
**CVSS**: 9.8 (Network, No privileges, No user interaction)

The entire application uses `SUPABASE_SERVICE_ROLE_KEY` for every database operation via the `db` singleton. This key bypasses **all Row Level Security (RLS)** policies. Every API route using `db` operates with full admin privileges on the database.

```typescript
// Line 7: Admin key — bypasses ALL RLS
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

The `createClient()` from `@/lib/supabase/server` (which properly uses the `ANON_KEY` with user-scoped RLS) is used **only for auth verification** (`supabase.auth.getUser()`). All actual data operations bypass it.

**Why this matters**: If any authorization check is missed or has a logic flaw in a single route, an attacker gains full read/write/delete access to **all academies' data** (not just their own). The academy-scoping (`eq("academyId", ...)`) is entirely application-level — no database enforcement.

**Fix**: Use the user-scoped Supabase client (`createClient()` from `@/lib/supabase/server`) for all data operations. Enable RLS policies on all tables scoped to `academyId`. Reserve `SERVICE_ROLE_KEY` only for operations that genuinely need admin privileges (e.g., `db.auth.admin.getUserById()` in `high-risk.ts`).

---

## 🟠 HIGH — No CSRF Protection on State-Changing Endpoints

**Files**: All `POST`, `PATCH`, `DELETE` endpoints  
**CVSS**: 6.5

There is **no middleware** (`middleware.ts` not found) and **no CSRF token validation** on any state-changing endpoint. Auth is verified via cookie-based Supabase sessions (`supabase.auth.getUser()`), which means a malicious site can trigger authenticated requests on behalf of a logged-in user.

**Affected endpoints** (all accept POST/PATCH/DELETE):
- `/api/students`, `/api/students/[id]` — delete students
- `/api/actions`, `/api/actions/[id]` — create/update/delete interventions
- `/api/sessions`, `/api/payments`, `/api/tutors` — bulk delete
- `/api/demo/seed` — seed demo data
- `/api/scoring/run` — trigger scoring
- `/api/uploads/[id]/map`, `/api/uploads/[id]/process` — mutate uploads

**Fix**: Add a CSRF middleware that checks `Origin`/`Referer` headers and/or issues CSRF tokens. Next.js has built-in CSRF protection via `next-auth`; for Supabase, consider using the `@supabase/ssr` cookie handling combined with same-site cookie attributes.

---

## 🟠 HIGH — Email Confirmation Disabled

**File**: `src/app/(auth)/actions.ts` (line 53-54)  
**CVSS**: 6.5

```typescript
// Email confirmation disabled: session returned immediately.
if (data.session && data.user) {
    const dest = await getRedirectForUser(data.user.id)
    redirect(dest)
}
```

Users can sign up with **any email address** — real or fake — and immediately access the application. There is no email verification step.

**Impact**:
- Spam account creation
- Impossible to recover accounts (fake emails)
- Any user who knows another user's email could potentially cause confusion
- No audit trail integrity

**Fix**: Enable email confirmation in Supabase Auth settings. Remove the immediate session grant and only redirect after email verification.

---

## 🟡 MEDIUM — Geo IP API Called Over Plain HTTP

**File**: `src/app/api/geo/route.ts` (line 14)  
**CVSS**: 5.3

```typescript
const res = await fetch("http://ip-api.com/json/?fields=status,countryCode", {
```

The fallback geo-IP lookup uses **plain HTTP**, not HTTPS. This exposes the server's IP and the request to MITM attacks. While the data isn't highly sensitive (just country code), an attacker could:
- Inject fake country codes
- Track server requests
- Potentially pivot to other attacks if the response parsing has bugs

**Fix**: Change to `https://ip-api.com/json/...`

---

## 🟡 MEDIUM — No Rate Limiting on Any Endpoint

**Files**: All API routes

None of the API routes implement rate limiting. Specific concerns:

| Endpoint | Risk |
|----------|------|
| `POST /api/demo/seed` | Can be called repeatedly (though blocked if students exist) |
| `POST /api/auth/*` | Brute-force login attempts |
| `POST /api/uploads` | Repeated large uploads (10MB each) |
| `POST /api/scoring/run` | Repeated scoring triggers (OpenAI API costs!) |

**Fix**: Implement rate limiting via Upstash Redis (already a dependency!) or a middleware. Use `@upstash/ratelimit` with the existing `@upstash/redis` client.

---

## 🟡 MEDIUM — Database Error Messages Exposed to Clients

**Files**: Multiple routes

Several endpoints pass raw database error messages to the client:

```typescript
// src/app/api/uploads/route.ts:70
throw new Error(`Failed to create import set: ${insertError.message}`);

// src/lib/deletions/bulk-delete.ts:21
throw new Error(`Failed to verify ${table} ownership: ${error.message}`);
```

These error messages are then returned as JSON responses, potentially leaking:
- Table names and schema structure
- Column names
- Database internal error details
- Query patterns

**Fix**: Log the detailed error server-side; return generic error messages to clients.

---

## 🟡 MEDIUM — File Upload Type Validation Is Extension-Only

**File**: `src/app/api/uploads/route.ts` (lines 116-118)

```typescript
const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
if (!ALLOWED_TYPES.includes(ext)) {
```

File type validation checks **only the file extension**, not the actual MIME type or content. An attacker could rename `malware.exe` to `data.csv` and upload it. While `parseFile()` would likely fail on the content, the file is already stored in Supabase Storage before parsing.

**Also**: The filename sanitization on line 194 is basic — it replaces non-alphanumeric chars with `_` but doesn't prevent path traversal characters that survive the regex.

**Fix**: Validate MIME type server-side; check file magic bytes for CSV/XLSX. Use a stronger filename sanitizer.

---

## 🟢 LOW — No Input Size Limits on JSON Bodies

**Files**: `POST /api/actions`, `PATCH /api/uploads/[id]/map`, etc.

Several endpoints call `await req.json()` without size limits, making them vulnerable to memory exhaustion via large JSON payloads.

**Fix**: Add body size validation or use `req.body` streaming with limits. Next.js has a default 4MB body limit, but this can still be large enough to cause issues on repeated requests.

---

## 🟢 LOW — Trusted `file.type` From Client for Storage

**File**: `src/app/api/uploads/route.ts` (line 200)

```typescript
contentType: file.type || "application/octet-stream",
```

The client-provided `file.type` is trusted as the Content-Type for Supabase Storage. A malicious client could set this to `text/html` or any other misleading type.

**Fix**: Determine Content-Type server-side from the file content or use a safe default.

---

## 🟢 LOW — OpenAI Usage Log Stores Error Details

**File**: `src/lib/ai/openai-client.ts` (line 66)

```typescript
errorCode: error instanceof Error ? error.name : "UnknownError",
```

While this only stores the error **name** (not message), errors from OpenAI could potentially leak API key fragments or request details into the usage log table, which is queryable.

**Fix**: Sanitize error data before logging; never log raw error messages from external APIs.

---

## ℹ️ INFO — `.env` Files Present in Working Directory

The `.gitignore` correctly excludes `.env*` files, and `git ls-files` confirms they are NOT tracked. However, `.env` and `.env.local` exist in the working directory. Ensure these are never accidentally committed (e.g., via `git add -f`).

---

## ℹ️ INFO — Dependency Versions

| Package | Version | Notes |
|---------|---------|-------|
| next | 16.2.4 | Latest |
| @supabase/supabase-js | ^2.105.1 | Current |
| openai | ^6.35.0 | Current |
| react | 19.2.4 | Latest |
| zod | ^4.4.2 | Zod 4 (new major) |

No known CVEs in the current dependency set. ✅

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 1 | SERVICE_ROLE_KEY bypasses all RLS |
| 🟠 High | 2 | No CSRF, email confirmation disabled |
| 🟡 Medium | 4 | HTTP geo API, no rate limiting, error exposure, weak file validation |
| 🟢 Low | 3 | JSON size limits, trusted client MIME, error logging |
| ℹ️ Info | 2 | Env files present, dependency check |

**Top Priority**: Fix the `SERVICE_ROLE_KEY` usage — it's the architectural equivalent of running every query as a database superuser. Right now, the only thing preventing cross-academy data access is that every developer remembered to add `.eq("academyId", ...)` to every query. One missed check = full data breach.

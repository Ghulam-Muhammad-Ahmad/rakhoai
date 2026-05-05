Good—now let’s turn all those problems into **clear, actionable fixes**. I’ll prioritize them so you know what to build first vs later.

---

# 🚨 Tier 1 — MUST FIX (core product will break without these)

## 1. Different data types for same field

**Problem:**
Attendance, payment, dates come in many formats.

**Solution:**
Build a **type detection + normalization layer** before saving.

```text
mapping → type detection → normalization → validation → save
```

* Detect input type (boolean, %, ratio, text)
* Convert → single canonical format (e.g., attendance = 0–100)

👉 This is your **core intelligence layer**

---

## 2. Weak column matching (brittle mapping)

**Problem:**
Rule-based matching fails on messy headers.

**Solution:**
Use **hybrid mapping**:

```text
rule-based (fast) → fallback to AI
```

* Rules for common cases
* AI (via OpenAI API) for unknown columns

Also:

* Normalize headers before matching

---

## 3. No mapping confidence

**Problem:**
You don’t know if mapping is correct or risky.

**Solution:**
Return:

```json
{
  "source": "Std Nm",
  "target": "student_name",
  "confidence": 0.82
}
```

👉 Use this to:

* auto-accept high confidence
* flag low confidence in UI

---

## 4. No row-level validation feedback

**Problem:**
User can’t see what went wrong.

**Solution:**
Add:

* `row_errors` (DB or JSON)

Example:

```json
{
  "row": 12,
  "errors": ["invalid date", "attendance > 100"]
}
```

Also:

* Allow **download error CSV**

---

## 5. No proper review step

**Problem:**
System may silently insert bad data.

**Solution:**
Add **review UI after mapping**:

* show detected columns
* show sample transformed values
* allow manual correction

---

# ⚠️ Tier 2 — VERY IMPORTANT (scaling & reliability)

## 6. `rawRowsJson` stored in DB

**Problem:**
Will not scale.

**Solution:**

* Move full raw data to Supabase Storage
* Keep only:

  * sample rows in DB
  * metadata

---

## 7. Synchronous processing

**Problem:**
Large uploads will timeout.

**Solution:**
Use background jobs:

```text
PROCESSING → PROCESSED
```

Options:

* queue (BullMQ / workers)
* async job runner

---

## 8. Risk scoring tightly coupled

**Problem:**
Hard to update later.

**Solution:**
Split:

```text
Ingestion → store clean data
Scoring → separate job
```

👉 allows re-scoring anytime

---

## 9. No reprocessing system

**Problem:**
User must re-upload to fix issues.

**Solution:**
Add:

* “Re-run with new mapping”
* “Recalculate risk score”

Use stored raw data

---

## 10. Missing required field enforcement

**Problem:**
Bad data enters system.

**Solution:**

* Required → block
* Recommended → warn
* Optional → ignore

---

# 🧠 Tier 3 — INTELLIGENCE LAYER (this makes it “AI SaaS”)

## 11. No learning from user corrections

**Problem:**
Same mistakes repeat.

**Solution:**

* Store user-approved mappings
* Auto-apply next time per academy

---

## 12. No handling of weird values

**Problem:**
Inputs like:

```text
"irregular"
"good"
"last week"
```

**Solution:**

* Rule-based interpretation first
* AI fallback for ambiguous values
* Attach confidence + warning

---

## 13. No data type hints in UI

**Problem:**
User doesn’t know what system assumed.

**Solution:**
Show:

```text
Column: Attendance
Detected: Boolean → Converted to %
```

Allow override

---

## 14. No duplicate detection

**Problem:**
Same student may be inserted multiple times.

**Solution:**

* Use:

  * phone
  * student_id
  * fuzzy name match
* Add merge logic

---

## 15. No audit trail

**Problem:**
Hard to debug user complaints.

**Solution:**
Store:

* original value
* normalized value
* mapping used
* errors

---

# 🏗️ Tier 4 — DATA STRUCTURE & FLEXIBILITY

## 16. Single-sheet assumption

**Problem:**
Wrong sheet may be parsed.

**Solution:**

* Auto-detect sheet with most data
* Or let user select sheet

---

## 17. No schema versioning

**Problem:**
Future updates may break old uploads.

**Solution:**
Add:

```text
schema_version
mapping_version
```

---

## 18. Static templates only

**Problem:**
Formats change over time.

**Solution:**

* Combine:

  * template + AI mapping
* Allow template evolution

---

## 19. No separation of data stages

**Problem:**
Hard to debug pipeline.

**Solution:**
Clearly separate:

```text
raw → cleaned → mapped → normalized → final
```

---

## 20. Excel messiness not handled

**Problem:**
Merged cells, empty rows, etc.

**Solution:**
Improve parser:

* skip empty top rows
* detect header row
* ignore summary/footer rows

---

# 🎯 If you do ONLY 5 things right now

Start with:

1. ✅ Type detection + normalization layer
2. ✅ Hybrid mapping (rules + AI)
3. ✅ Mapping confidence + UI
4. ✅ Row-level error reporting
5. ✅ Background processing

---

# 💡 Big picture

Right now you built:
👉 a **file uploader + mapper**

You need to evolve into:
👉 a **messy data → clean structured intelligence system**

That shift is what makes your SaaS valuable.

---

If you want next, I can:

* Design your **type detection engine (code-level)**
* Or rewrite your **normalize.ts into a production-grade pipeline**
* Or give you **DB schema improvements for all this**

Just tell me 👍

# Risk Score Backtest Harness

`scripts/backtest-scoring.mjs` measures whether the RakhoAI rule-based risk
score actually **predicts churn**. It scores each student **as-of a cutoff
date** (using only data on/before the cutoff), then checks what actually
happened **after** the cutoff. No real labelled churn data is required to run
it — it ships with a reproducible synthetic dataset — but it is built to be
pointed at a real academy's history with a tiny export.

```bash
node scripts/backtest-scoring.mjs                      # synthetic demo (seed=42)
node scripts/backtest-scoring.mjs --cutoff 2026-03-01 --window 30
```

Pure Node stdlib. No npm installs, no network, no DB access.

---

## What "churn" means here (and how to change it)

The default churn label lives in **one clearly-named function**:

```js
function isChurned_zeroSessionsAfter(student, cutoff, churnWindowDays) { ... }
```

> **Default definition:** a student is *churned* if they attended **zero
> sessions** in the `churnWindowDays` (default 30) **after** the cutoff.

To use a different definition (e.g. "fewer than 2 sessions", or "no sessions
**and** cancelled their payment plan"), write a new `isChurned_*` function with
the same signature and pass it as `isChurned` in `opts` inside `main()`. Keeping
each definition as its own labelled function makes it obvious which rule a given
report was produced with.

---

## How the as-of scoring works (no leakage)

For each student the harness calls `buildAsOfInput(student, cutoff)`, which
derives the scoring signals using **only rows dated on/before the cutoff**:

| Signal | Derivation (as-of cutoff) |
|---|---|
| `lastSessionDate` | date of the last **attended** session ≤ cutoff |
| `attendanceRate` | attended / (attended + cancelled/absent), as 0–100 |
| `paymentStatus` | status of the most recent payment ≤ cutoff |
| `latePayments` | count of payments ≤ cutoff with status containing "late" |
| `rescheduledSessions` / `cancelledSessions` | counts ≤ cutoff |
| `paymentDataMissing` | true if no payments exist ≤ cutoff |
| `tutor` | student's assigned tutor |

It then runs the **mirror** of `src/lib/scoring/rules.ts`
(`computeRuleScore` + `getRiskBand`) at `now = cutoff`. A student is **flagged
"at-risk"** when their band is `HIGH` or `MEDIUM`.

> **Recency note:** `lastSessionDate` is anchored to the last *attended*
> session, not just the last *row*. A run of recent cancellations/no-shows
> should still read as "stale", which is what makes the >14-day recency rule
> meaningful. `rules.ts` itself just reads `student.lastSessionDate`; this is the
> harness's choice for what to put in that field. If your real pipeline defines
> `lastSessionDate` differently, mirror that choice in `buildAsOfInput`.

> **Keep-in-sync:** `computeRuleScore`/`getRiskBand` are a copied mirror of
> `src/lib/scoring/rules.ts` so the harness stays dependency-free and never
> imports from `src/`. If the weights/thresholds in `rules.ts` change, update
> the mirror at the top of `backtest-scoring.mjs` to match (there's a header
> comment marking it).

---

## How to read the metrics

```
Confusion matrix (flagged at-risk  vs  actually churned)
                       churned    not-churned
  flagged at-risk        TP        FP
  not flagged            FN        TN
```

- **Precision** — of the students we flagged, what fraction actually churned.
  Low precision = we cry wolf and waste the team's intervention time.
- **Recall** — of the students who churned, what fraction we flagged in time.
  Low recall = silent churn we never saw coming.
- **F1** — harmonic mean of precision & recall (one number to compare runs).
- **Base rate & lift** — overall churn rate vs. churn rate among flagged
  students. **Lift = (churn rate if flagged) / (overall churn rate).** Lift > 1
  means the flag is doing better than a coin-flip / blanket assumption. The
  higher the lift, the more the score is genuinely sorting risk.
- **Breakdown by band** — churn rate within HIGH / MEDIUM / LOW. A healthy model
  shows a clear monotonic gradient (HIGH churns most, LOW least).

### Synthetic baseline (what a clean run looks like)

The shipped synthetic dataset (50 students, seed 42) produces roughly:

```
TP=24  FP=2  FN=2  TN=22
Precision 92.3%  Recall 92.3%  F1 92.3%
Overall churn 52.0%  |  churn-if-flagged 92.3%  |  lift 1.78x
HIGH 100% churn  |  MEDIUM ~87%  |  LOW ~8%
```

The synthetic "declining" and "ghosted" cohorts decline by construction (fading
attendance + payment trouble), so they trip the rules and are caught — proving
the harness end-to-end. The "stable" and most "ambiguous" cohorts keep attending
and are correctly left alone.

---

## Pointing it at REAL data

Replace the synthetic generator with a real export. The harness expects an array
of students shaped like:

```js
{
  studentId: "uuid",
  name: "Asha K.",
  tutor: "Ms. Khan" | null,
  sessions: [ { sessionDate: "2026-01-08", attendanceStatus: "present" }, ... ],
  payments: [ { paymentDate: "2026-01-01", paymentStatus: "paid", amount: 200 }, ... ],
}
```

Attendance statuses are bucketed as: attended = `present`/`attended`/`completed`;
missed = `cancelled`/`absent`/`no-show`; `rescheduled` tracked separately.

### 1. Export from Supabase

Run this against one academy (psql / Supabase SQL editor) and save the JSON. The
tables are `Student`, `Session(studentId, sessionDate, attendanceStatus)`, and
`Payment(studentId, paymentDate, paymentStatus, amount)`:

```sql
select json_agg(row) from (
  select
    s.id          as "studentId",
    s.name        as "name",
    s.tutor       as "tutor",
    coalesce((
      select json_agg(json_build_object(
        'sessionDate', se."sessionDate",
        'attendanceStatus', se."attendanceStatus"))
      from "Session" se where se."studentId" = s.id
    ), '[]'::json) as "sessions",
    coalesce((
      select json_agg(json_build_object(
        'paymentDate', pa."paymentDate",
        'paymentStatus', pa."paymentStatus",
        'amount', pa."amount"))
      from "Payment" pa where pa."studentId" = s.id
    ), '[]'::json) as "payments"
  from "Student" s
  where s."academyId" = '<ACADEMY_ID>'
) row;
```

(Adjust column names to match your actual schema if they differ.)

### 2. Feed it to the harness

Save the JSON to `scripts/real-data.json`, then in `main()` swap:

```js
// const students = generateSyntheticDataset({ cutoff, churnWindowDays, seed: 42 });
import { readFileSync } from "node:fs";
const students = JSON.parse(readFileSync("scripts/real-data.json", "utf8"));
opts.datasetLabel = "REAL (academy <id>)";
```

### 3. Choose a cutoff with a complete window

Pick a `--cutoff` that is at least `churnWindowDays` in the **past**, so the
after-cutoff window is fully observed (otherwise students look "churned" simply
because the data hasn't arrived yet). Example: with a 30-day window, don't pick a
cutoff newer than ~35 days ago.

---

## Caveat: tune weights ONLY against real outcomes

The synthetic numbers prove the *plumbing*, not the *weights*. The +30 / +25 /
+20 / +10 / +5 point values and the 70/40 band thresholds are educated guesses
until they're validated against a real academy's churn. Once you have one
academy's labelled history:

1. Run the backtest to get baseline precision/recall/lift.
2. Adjust weights/thresholds in `rules.ts` (and mirror here), re-run, compare F1
   and lift. Prefer changes that raise recall without collapsing precision —
   missed churn is usually costlier than a false alarm in retention.
3. Only ship weight changes that improve metrics on **held-out** real data, not
   on the synthetic set.

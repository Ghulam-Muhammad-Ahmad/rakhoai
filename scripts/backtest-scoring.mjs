#!/usr/bin/env node
// ---------------------------------------------------------------------------
// backtest-scoring.mjs  —  Offline validation / backtest harness for the
// RakhoAI rule-based churn risk score.
//
// PURPOSE
//   Measure whether the risk score actually predicts churn, by scoring each
//   student AS-OF a cutoff date (using only data on/before the cutoff) and
//   comparing the flag against what actually happened AFTER the cutoff.
//
//   No real labelled churn data exists yet, so this script ships with a
//   reproducible synthetic dataset that demonstrates the harness end-to-end.
//   See scripts/BACKTEST.md for how to point it at a real academy's data.
//
// ⚠️  KEEP-IN-SYNC NOTE
//   computeRuleScore / getRiskBand below are a faithful re-implementation of
//   src/lib/scoring/rules.ts (commit logic: +30 stale session >14d, +25 low
//   attendance <75, +20 overdue/unpaid/late payment, +10 pending/partial/due,
//   +10 latePayments, +5 rescheduledSessions, +10 no tutor; capped 100;
//   bands HIGH>=70, MEDIUM>=40, LOW<40). This file is intentionally a COPY so
//   the harness stays dependency-free and never touches src/. If rules.ts
//   changes its weights or thresholds, update the mirror below to match.
//
// USAGE
//   node scripts/backtest-scoring.mjs
//   node scripts/backtest-scoring.mjs --cutoff 2026-03-01 --window 30
//
// CONSTRAINTS: pure Node stdlib, no npm installs, no network, no live DB.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

// ===========================================================================
// MIRROR OF src/lib/scoring/rules.ts  (see KEEP-IN-SYNC note above)
// ===========================================================================

function getRiskBand(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// student: CanonicalStudentInput-shaped object. `now` is the as-of date.
function computeRuleScore(student, now = new Date()) {
  let score = 0;
  const reasons = [];

  if (student.lastSessionDate) {
    const daysSinceLastSession = daysBetween(student.lastSessionDate, now);
    if (daysSinceLastSession > 14) {
      score += 30;
      reasons.push(`Has not attended a session in ${daysSinceLastSession} days`);
    }
  }

  if (typeof student.attendanceRate === "number" && student.attendanceRate < 75) {
    score += 25;
    reasons.push(`Attendance is ${student.attendanceRate}%`);
  }

  const payment = (student.paymentStatus ?? "").toLowerCase();
  if (payment.includes("overdue") || payment.includes("unpaid") || payment.includes("late")) {
    score += 20;
    reasons.push(`Payment status is ${student.paymentStatus}`);
  } else if (payment.includes("pending") || payment.includes("partial") || payment.includes("due")) {
    score += 10;
    reasons.push(`Payment status is ${student.paymentStatus}`);
  }

  const structuredSignals = student.rawData?.structuredSignals;
  if (structuredSignals?.paymentDataMissing) {
    reasons.push("Payment data missing for this student");
  }
  if (structuredSignals?.latePayments) {
    score += 10;
    reasons.push(`${structuredSignals.latePayments} late payment(s) detected`);
  }
  if (structuredSignals?.rescheduledSessions) {
    score += 5;
    reasons.push(`${structuredSignals.rescheduledSessions} rescheduled session(s) detected`);
  }
  if (structuredSignals?.cancelledSessions) {
    reasons.push(`${structuredSignals.cancelledSessions} cancelled session(s) tracked separately`);
  }

  if (!student.tutor) {
    score += 10;
    reasons.push("No tutor is assigned");
  }

  return { score: Math.min(score, 100), reasons };
}

// ===========================================================================
// AS-OF SIGNAL DERIVATION
//   Builds a CanonicalStudentInput-shaped object using ONLY rows dated on or
//   before the cutoff. This is what makes it a backtest rather than a snapshot.
// ===========================================================================

function toDate(d) {
  return d instanceof Date ? d : new Date(d);
}

// A "session" counts toward attendance if attendanceStatus is present/attended.
const ATTENDED = new Set(["present", "attended", "completed"]);
const RESCHEDULED = new Set(["rescheduled", "reschedule"]);
const CANCELLED = new Set(["cancelled", "canceled", "no-show", "noshow", "absent", "no_show"]);

function buildAsOfInput(student, cutoff) {
  const cutoffTs = cutoff.getTime();

  const pastSessions = student.sessions
    .filter((s) => toDate(s.sessionDate).getTime() <= cutoffTs)
    .sort((a, b) => toDate(a.sessionDate) - toDate(b.sessionDate));

  const pastPayments = student.payments
    .filter((p) => toDate(p.paymentDate).getTime() <= cutoffTs)
    .sort((a, b) => toDate(a.paymentDate) - toDate(b.paymentDate));

  // last session date (as-of): the last session the student ACTUALLY ATTENDED.
  // The recency rule ("not attended in >14 days") is only meaningful against
  // real attendance — a string of recent cancellations/no-shows should still
  // read as "stale", not "fresh". So we anchor recency to attended sessions.
  // (rules.ts reads student.lastSessionDate verbatim; this is the harness's
  // derivation choice for what that field should contain.)
  const attendedSessions = pastSessions.filter((s) =>
    ATTENDED.has((s.attendanceStatus ?? "").toLowerCase())
  );
  const lastAttended = attendedSessions.length
    ? attendedSessions[attendedSessions.length - 1]
    : null;
  const lastSessionDate = lastAttended ? toDate(lastAttended.sessionDate) : null;

  // attendance rate = attended / (attended + cancelled/absent), as a 0-100 number
  let attended = 0;
  let missed = 0;
  let rescheduledSessions = 0;
  let cancelledSessions = 0;
  for (const s of pastSessions) {
    const st = (s.attendanceStatus ?? "").toLowerCase();
    if (ATTENDED.has(st)) attended += 1;
    else if (RESCHEDULED.has(st)) rescheduledSessions += 1;
    else if (CANCELLED.has(st)) {
      cancelledSessions += 1;
      missed += 1;
    }
  }
  const denom = attended + missed;
  const attendanceRate = denom > 0 ? Math.round((attended / denom) * 100) : null;

  // payment status (as-of): use most recent payment's status
  const lastPayment = pastPayments.length ? pastPayments[pastPayments.length - 1] : null;
  const paymentStatus = lastPayment ? lastPayment.paymentStatus : null;
  const latePayments = pastPayments.filter((p) =>
    (p.paymentStatus ?? "").toLowerCase().includes("late")
  ).length;

  return {
    name: student.name,
    lastSessionDate,
    attendanceRate,
    paymentStatus,
    tutor: student.tutor ?? null,
    rawData: {
      structuredSignals: {
        paymentDataMissing: pastPayments.length === 0,
        latePayments,
        rescheduledSessions,
        cancelledSessions,
      },
    },
  };
}

// ===========================================================================
// CHURN DEFINITION  (swappable)
//   DEFAULT: a student is "churned" if they attended ZERO sessions in the
//   churnWindowDays AFTER the cutoff. Swap this function to change the label
//   (e.g. require <2 sessions, or factor in payment cancellation, etc.).
// ===========================================================================

function isChurned_zeroSessionsAfter(student, cutoff, churnWindowDays) {
  const cutoffTs = cutoff.getTime();
  const windowEndTs = cutoffTs + churnWindowDays * MS_PER_DAY;
  const attendedInWindow = student.sessions.filter((s) => {
    const ts = toDate(s.sessionDate).getTime();
    const st = (s.attendanceStatus ?? "").toLowerCase();
    return ts > cutoffTs && ts <= windowEndTs && ATTENDED.has(st);
  }).length;
  return attendedInWindow === 0;
}

// ===========================================================================
// BACKTEST RUNNER
// ===========================================================================

function runBacktest(students, { cutoff, churnWindowDays, isChurned }) {
  const rows = [];
  for (const student of students) {
    const asOf = buildAsOfInput(student, cutoff);
    const { score } = computeRuleScore(asOf, cutoff);
    const band = getRiskBand(score);
    const flagged = band === "HIGH" || band === "MEDIUM";
    const churned = isChurned(student, cutoff, churnWindowDays);
    rows.push({ name: student.name, score, band, flagged, churned });
  }
  return rows;
}

function computeMetrics(rows) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const r of rows) {
    if (r.flagged && r.churned) tp += 1;
    else if (r.flagged && !r.churned) fp += 1;
    else if (!r.flagged && r.churned) fn += 1;
    else tn += 1;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const total = rows.length;
  const totalChurned = rows.filter((r) => r.churned).length;
  const baseRate = total > 0 ? totalChurned / total : 0;
  const flaggedCount = tp + fp;
  const flaggedChurnRate = flaggedCount > 0 ? tp / flaggedCount : 0;
  const lift = baseRate > 0 ? flaggedChurnRate / baseRate : 0;

  return {
    tp, fp, fn, tn,
    precision, recall, f1,
    total, totalChurned, baseRate,
    flaggedCount, flaggedChurnRate, lift,
  };
}

function bandBreakdown(rows) {
  const bands = ["HIGH", "MEDIUM", "LOW"];
  return bands.map((band) => {
    const inBand = rows.filter((r) => r.band === band);
    const churned = inBand.filter((r) => r.churned).length;
    const rate = inBand.length > 0 ? churned / inBand.length : 0;
    return { band, count: inBand.length, churned, rate };
  });
}

// ===========================================================================
// SEEDED PRNG  (mulberry32 — deterministic, reproducible)
// ===========================================================================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

// ===========================================================================
// SYNTHETIC DATASET GENERATOR
//   ~50 students with realistic, reproducible patterns. By construction:
//     - "declining" + "ghosted" cohorts trip the rules AND actually churn
//       (zero attended sessions after the cutoff) -> should be caught (recall).
//     - "stable" cohort keeps attending past the cutoff -> should NOT be flagged.
//   Fixed seed => identical output every run.
// ===========================================================================

function generateSyntheticDataset({ cutoff, churnWindowDays, seed = 42 }) {
  const rnd = mulberry32(seed);
  const students = [];
  const tutors = ["Ms. Khan", "Mr. Patel", "Dr. Lee", "Ms. Rao"];

  // History starts ~150 days before cutoff; window extends churnWindowDays after.
  const historyStart = addDays(cutoff, -150);

  let id = 0;
  function makeStudent(name, profile) {
    id += 1;
    const student = {
      studentId: `s${id}`,
      name,
      tutor: profile.noTutor ? null : tutors[id % tutors.length],
      sessions: [],
      payments: [],
    };

    // --- Sessions BEFORE cutoff (weekly, with profile-driven attendance decay)
    let day = 0;
    while (true) {
      const sessionDate = addDays(historyStart, day);
      if (sessionDate.getTime() > cutoff.getTime()) break;
      // progress 0..1 across the pre-cutoff history
      const progress = day / 150;
      let attendProb = profile.baseAttend;
      const daysToCutoff = daysBetween(sessionDate, cutoff);
      if (profile.declining) {
        // Decay: attendance falls off across the history so the lifetime
        // attendance rate drops well below 75% (trips the +25 rule). AND the
        // student goes quiet in the final ~21 days before cutoff, so the last
        // attended session is stale (>14d) and the +30 recency rule also fires.
        // This is exactly how a real "fading then churned" student looks.
        attendProb = profile.baseAttend * (1 - 0.7 * progress);
        if (daysToCutoff <= 21) attendProb = 0;
      }
      const attended = rnd() < attendProb;
      let status = attended ? "present" : (rnd() < 0.5 ? "cancelled" : "absent");
      if (!attended && rnd() < 0.2) status = "rescheduled";
      student.sessions.push({ sessionDate, attendanceStatus: status });
      day += 7;
    }

    // --- Sessions AFTER cutoff (determines the actual churn label)
    let postDay = 7;
    while (postDay <= churnWindowDays + 14) {
      const sessionDate = addDays(cutoff, postDay);
      // churners attend nothing after cutoff; stable students keep showing up
      if (profile.churnsAfter) {
        // no attended sessions; maybe a stray cancellation early on
        if (postDay <= 7 && rnd() < 0.3) {
          student.sessions.push({ sessionDate, attendanceStatus: "cancelled" });
        }
      } else {
        const attended = rnd() < profile.baseAttend;
        student.sessions.push({
          sessionDate,
          attendanceStatus: attended ? "present" : "absent",
        });
      }
      postDay += 7;
    }

    // --- Payments before cutoff
    let pday = 0;
    while (true) {
      const paymentDate = addDays(historyStart, pday);
      if (paymentDate.getTime() > cutoff.getTime()) break;
      let st = "paid";
      if (profile.paymentTrouble) {
        const r = rnd();
        st = r < 0.4 ? "overdue" : r < 0.7 ? "late" : "paid";
      } else if (rnd() < 0.1) {
        st = "pending";
      }
      student.payments.push({ paymentDate, paymentStatus: st, amount: 200 });
      pday += 30;
    }
    if (profile.noPaymentData) student.payments = [];

    students.push(student);
  }

  // 18 stable students (should NOT churn, should NOT be flagged)
  for (let i = 0; i < 18; i++) {
    makeStudent(`Stable Student ${i + 1}`, {
      baseAttend: 0.9,
      declining: false,
      churnsAfter: false,
    });
  }

  // 16 clearly-declining students (attendance decays, then churn after cutoff)
  for (let i = 0; i < 16; i++) {
    makeStudent(`Declining Student ${i + 1}`, {
      baseAttend: 0.85,
      declining: true,
      churnsAfter: true,
      paymentTrouble: i % 2 === 0,
    });
  }

  // 10 "ghosted" students: stopped attending well before cutoff (stale >14d),
  // then churn -> should be flagged via the recency rule.
  for (let i = 0; i < 10; i++) {
    const s = {
      profile: true,
    };
    void s;
    makeStudent(`Ghosted Student ${i + 1}`, {
      baseAttend: 0.6,
      declining: false,
      churnsAfter: true,
      noTutor: i % 3 === 0,
    });
    // surgically remove this student's last ~5 weeks of pre-cutoff sessions so
    // the most recent attended session is well over 14 days before cutoff.
    const last = students[students.length - 1];
    last.sessions = last.sessions.filter(
      (ss) => toDate(ss.sessionDate).getTime() <= addDays(cutoff, -35).getTime()
    );
  }

  // 6 ambiguous students: mildly declining payment trouble but keep attending
  // (should generally NOT churn — tests against over-flagging).
  for (let i = 0; i < 6; i++) {
    makeStudent(`Ambiguous Student ${i + 1}`, {
      baseAttend: 0.8,
      declining: false,
      churnsAfter: false,
      paymentTrouble: true,
    });
  }

  return students;
}

// ===========================================================================
// OUTPUT FORMATTING
// ===========================================================================

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function printReport(rows, metrics, breakdown, opts) {
  const line = "-".repeat(64);
  console.log(line);
  console.log("RakhoAI Risk Score — Backtest Report");
  console.log(line);
  console.log(`Cutoff date        : ${opts.cutoff.toISOString().slice(0, 10)}`);
  console.log(`Churn window        : ${opts.churnWindowDays} days after cutoff`);
  console.log(`Churn definition    : ${opts.churnLabel}`);
  console.log(`Dataset             : ${opts.datasetLabel}  (${metrics.total} students)`);
  console.log(`Flag rule           : band HIGH or MEDIUM = "at-risk"`);
  console.log(line);

  console.log("Confusion matrix (flagged at-risk  vs  actually churned)");
  console.log("                       churned    not-churned");
  console.log(`  flagged at-risk        TP=${String(metrics.tp).padStart(3)}      FP=${String(metrics.fp).padStart(3)}`);
  console.log(`  not flagged            FN=${String(metrics.fn).padStart(3)}      TN=${String(metrics.tn).padStart(3)}`);
  console.log(line);

  console.log("Headline metrics");
  console.log(`  Precision           : ${pct(metrics.precision)}   (of flagged, how many churned)`);
  console.log(`  Recall              : ${pct(metrics.recall)}   (of churners, how many we flagged)`);
  console.log(`  F1                  : ${pct(metrics.f1)}`);
  console.log(line);

  console.log("Base rate & lift");
  console.log(`  Overall churn rate  : ${pct(metrics.baseRate)}   (${metrics.totalChurned}/${metrics.total})`);
  console.log(`  Churn rate if flagged: ${pct(metrics.flaggedChurnRate)}   (${metrics.tp}/${metrics.flaggedCount})`);
  console.log(`  Lift                : ${metrics.lift.toFixed(2)}x vs base rate`);
  console.log(line);

  console.log("Breakdown by risk band");
  console.log("  band      students   churned   churn-rate");
  for (const b of breakdown) {
    console.log(
      `  ${b.band.padEnd(8)}  ${String(b.count).padStart(6)}    ${String(b.churned).padStart(6)}    ${pct(b.rate).padStart(7)}`
    );
  }
  console.log(line);
}

// ===========================================================================
// CLI
// ===========================================================================

function parseArgs(argv) {
  const args = { cutoff: null, window: 30 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--cutoff") args.cutoff = argv[++i];
    else if (argv[i] === "--window") args.window = Number(argv[++i]);
  }
  return args;
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  const cutoff = cli.cutoff ? new Date(cli.cutoff) : new Date("2026-03-01T00:00:00Z");
  const churnWindowDays = cli.window || 30;

  const opts = {
    cutoff,
    churnWindowDays,
    isChurned: isChurned_zeroSessionsAfter,
    churnLabel: "zero attended sessions in the window after cutoff",
    datasetLabel: "SYNTHETIC (seed=42)",
  };

  const students = generateSyntheticDataset({ cutoff, churnWindowDays, seed: 42 });
  const rows = runBacktest(students, opts);
  const metrics = computeMetrics(rows);
  const breakdown = bandBreakdown(rows);

  printReport(rows, metrics, breakdown, opts);
}

main();

// Exported for reuse / unit testing if ever imported as a module.
export {
  computeRuleScore,
  getRiskBand,
  buildAsOfInput,
  isChurned_zeroSessionsAfter,
  runBacktest,
  computeMetrics,
  bandBreakdown,
  generateSyntheticDataset,
  mulberry32,
};

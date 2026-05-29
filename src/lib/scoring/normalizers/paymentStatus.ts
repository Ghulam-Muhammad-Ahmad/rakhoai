import type { NormalizedField } from "./types";

type PaymentStatusCanonical = "paid" | "overdue" | "pending" | "partial";

const RULES: { keywords: string[]; canonical: PaymentStatusCanonical; confidence: number }[] = [
  { keywords: ["overdue", "late", "past due", "past-due", "arrears", "unpaid", "outstanding overdue"], canonical: "overdue", confidence: 0.95 },
  { keywords: ["partial", "part paid", "part-paid", "incomplete", "half", "installment"], canonical: "partial", confidence: 0.85 },
  { keywords: ["paid", "cleared", "settled", "complete", "done", "received", "ok"], canonical: "paid", confidence: 0.95 },
  { keywords: ["pending", "due", "upcoming", "outstanding", "awaiting", "not yet"], canonical: "pending", confidence: 0.9 },
];

// Negation in front of a positive payment word ("not paid", "no payment
// received") flips the meaning — these read as overdue, not paid. Caught before
// the keyword rules so the bare "paid"/"received" token can't win.
const NEGATED_PAID = /\b(?:not|non|no|never|hasn'?t|haven'?t|didn'?t|isn'?t|un)[\s-]*(?:yet[\s-]+)?(?:paid|payment|pay|received|clear(?:ed)?|settl(?:e|ed)|complete)\b/;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizePaymentStatus(value: unknown): NormalizedField<string> {
  const original = value;

  if (value == null || String(value).trim() === "") {
    return { value: null, sourceType: "empty", originalValue: original, confidence: 0 };
  }

  const text = String(value).trim();
  const lower = text.toLowerCase();

  if (NEGATED_PAID.test(lower)) {
    return { value: "overdue", sourceType: "rule_match", originalValue: original, confidence: 0.9 };
  }

  // Whole-word match so "received" doesn't fire on "not received" and
  // "outstanding" alone lands on pending, not overdue.
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`).test(lower))) {
      return { value: rule.canonical, sourceType: "rule_match", originalValue: original, confidence: rule.confidence };
    }
  }

  return { value: null, sourceType: "unknown", originalValue: original, confidence: 0 };
}

import type { NormalizedField } from "./types";

type PaymentStatusCanonical = "paid" | "overdue" | "pending" | "partial";

const RULES: { keywords: string[]; canonical: PaymentStatusCanonical; confidence: number }[] = [
  { keywords: ["paid", "cleared", "settled", "complete", "done", "received", "ok"], canonical: "paid", confidence: 0.95 },
  { keywords: ["overdue", "late", "past due", "past-due", "arrears", "unpaid", "not paid", "outstanding overdue"], canonical: "overdue", confidence: 0.95 },
  { keywords: ["pending", "due", "upcoming", "outstanding", "awaiting", "not yet"], canonical: "pending", confidence: 0.9 },
  { keywords: ["partial", "part paid", "part-paid", "incomplete", "half", "installment"], canonical: "partial", confidence: 0.85 },
];

export function normalizePaymentStatus(value: unknown): NormalizedField<string> {
  const original = value;

  if (value == null || String(value).trim() === "") {
    return { value: null, sourceType: "empty", originalValue: original, confidence: 0 };
  }

  const text = String(value).trim();
  const lower = text.toLowerCase();

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { value: rule.canonical, sourceType: "rule_match", originalValue: original, confidence: rule.confidence };
    }
  }

  return { value: null, sourceType: "unknown", originalValue: original, confidence: 0 };
}

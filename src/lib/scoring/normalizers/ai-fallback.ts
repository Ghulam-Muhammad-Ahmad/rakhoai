import { createLoggedChatCompletion } from "@/lib/ai/openai-client";
import type { NormalizedField } from "./types";

const MODEL = process.env.OPENAI_NORMALIZATION_MODEL ?? "gpt-4o-mini";

type AttendanceResult = Record<string, NormalizedField<number>>;
type PaymentResult = Record<string, NormalizedField<string>>;

export async function aiNormalizeAttendance(
  values: string[],
  opts: { academyId?: string | null; uploadId?: string | null }
): Promise<AttendanceResult> {
  const unique = [...new Set(values)];
  if (!unique.length) return {};

  const prompt = `Convert each attendance text value to a number 0-100 (percentage).
Return JSON: { "value_string": { "value": number|null, "sourceType": "ai_inferred", "confidence": 0-1 }, ... }
Rules:
- "good"/"high" ≈ 85, confidence 0.7
- "low"/"poor" ≈ 40, confidence 0.7
- "irregular"/"inconsistent" ≈ 50, confidence 0.6
- "excellent"/"perfect" = 100, confidence 0.8
- If truly uninterpretable: value null, confidence 0
Values: ${JSON.stringify(unique)}`;

  try {
    const response = await createLoggedChatCompletion({
      academyId: opts.academyId,
      uploadId: opts.uploadId,
      feature: "normalization",
      model: MODEL,
      payloadForHash: { type: "attendance_normalization", values: unique },
      request: {
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      },
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as Record<string, { value: number | null; sourceType: string; confidence: number }>;

    const result: AttendanceResult = {};
    for (const v of unique) {
      const r = parsed[v];
      if (r) {
        result[v] = { value: r.value, sourceType: "ai_inferred", originalValue: v, confidence: r.confidence };
      } else {
        result[v] = { value: null, sourceType: "ai_unknown", originalValue: v, confidence: 0 };
      }
    }
    return result;
  } catch {
    return Object.fromEntries(
      unique.map((v) => [v, { value: null, sourceType: "ai_error", originalValue: v, confidence: 0 }])
    );
  }
}

export async function aiNormalizePaymentStatus(
  values: string[],
  opts: { academyId?: string | null; uploadId?: string | null }
): Promise<PaymentResult> {
  const unique = [...new Set(values)];
  if (!unique.length) return {};

  const prompt = `Classify each payment status text into one of: "paid", "overdue", "pending", "partial", or null.
Return JSON: { "value_string": { "value": "paid"|"overdue"|"pending"|"partial"|null, "confidence": 0-1 }, ... }
Values: ${JSON.stringify(unique)}`;

  try {
    const response = await createLoggedChatCompletion({
      academyId: opts.academyId,
      uploadId: opts.uploadId,
      feature: "normalization",
      model: MODEL,
      payloadForHash: { type: "payment_normalization", values: unique },
      request: {
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      },
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as Record<string, { value: string | null; confidence: number }>;

    const result: PaymentResult = {};
    for (const v of unique) {
      const r = parsed[v];
      if (r) {
        result[v] = { value: r.value as string | null, sourceType: "ai_inferred", originalValue: v, confidence: r.confidence };
      } else {
        result[v] = { value: null, sourceType: "ai_unknown", originalValue: v, confidence: 0 };
      }
    }
    return result;
  } catch {
    return Object.fromEntries(
      unique.map((v) => [v, { value: null, sourceType: "ai_error", originalValue: v, confidence: 0 }])
    );
  }
}

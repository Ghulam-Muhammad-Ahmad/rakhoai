import { createLoggedChatCompletion } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage-log";

const SCHEMA_DESCRIPTION = `
student_name       — student's full name (REQUIRED — every upload must have this)
contact_info       — phone number, email, or WhatsApp contact
join_date          — date the student enrolled or started (ISO date or DD/MM/YYYY)
last_session_date  — date of the most recent class or session attended (critical for risk scoring)
attendance_rate    — attendance percentage or fraction (e.g. 85%, 17/20, 0.85 — critical for risk scoring)
last_payment_date  — date of the most recent payment received
payment_status     — payment state text (paid, unpaid, overdue, late, cleared — critical for risk scoring)
total_sessions     — total number of sessions/classes held or attended (integer)
fees_amount        — fee amount charged (monthly, per session — strip currency symbols)
subject            — subject, course, or class name
tutor_assigned     — name of the assigned tutor or teacher
notes              — any remarks, comments, or additional information
`.trim();

export type AiMappingResult = Record<string, { field: string | null; confidence: number; reason?: string }>;

let _redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts: { ex: number }) => Promise<void> } | null = null;

async function getRedis() {
  if (_redis) return _redis;
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    const { Redis } = await import("@upstash/redis");
    const r = new Redis({ url, token });
    _redis = {
      get: (k) => r.get<string>(k),
      set: async (k, v, opts) => { await r.set(k, v, { ex: opts.ex }); },
    };
    return _redis;
  } catch {
    return null;
  }
}

export async function aiMatch(
  unmappedColumns: { column: string; samples: string[] }[],
  uploadId: string,
  alreadyMapped: { column: string; field: string; layer: "exact" | "fuzzy"; samples: string[] }[] = []
): Promise<AiMappingResult> {
  if (!unmappedColumns.length && !alreadyMapped.length) return {};

  const cacheKey = `ai_mapping:${uploadId}`;
  const redis = await getRedis();

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const started = Date.now();
      await logAiUsage({
        uploadId,
        feature: "column_mapping",
        model: "gpt-4o-mini",
        payloadForHash: { cacheKey },
        cacheHit: true,
        status: "cache_hit",
        latencyMs: Date.now() - started,
      });
      return JSON.parse(cached) as AiMappingResult;
    }
  }

  const unmappedText = unmappedColumns.length
    ? "COLUMNS TO MAP (not yet matched — assign a field or null):\n" +
      unmappedColumns.map(({ column, samples }) => {
        const sampleStr = samples.filter(Boolean).slice(0, 5).join(" | ") || "(empty)";
        return `  - "${column}" → samples: ${sampleStr}`;
      }).join("\n")
    : "";

  const alreadyMappedText = alreadyMapped.length
    ? "\nALREADY MAPPED by exact/fuzzy rules (review and correct if wrong — return corrected field or keep as-is):\n" +
      alreadyMapped.map(({ column, field, layer, samples }) => {
        const sampleStr = samples.filter(Boolean).slice(0, 5).join(" | ") || "(empty)";
        return `  - "${column}" → currently: ${field} (${layer}) | samples: ${sampleStr}`;
      }).join("\n")
    : "";

  const userContent = [unmappedText, alreadyMappedText].filter(Boolean).join("\n\n");

  const model = "gpt-4o-mini";
  const response = await createLoggedChatCompletion({
    uploadId,
    feature: "column_mapping",
    model,
    payloadForHash: { unmappedColumns, alreadyMapped },
    request: {
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert at mapping messy spreadsheet columns to a student management schema.

Schema fields (with descriptions):
${SCHEMA_DESCRIPTION}

Your job:
1. For COLUMNS TO MAP: assign the best-fit schema field (or null if none fits). Confidence 0.5–0.95.
2. For ALREADY MAPPED columns: verify the existing mapping is correct given the sample data. If wrong, correct it. If correct, return the same field with higher confidence (add 0.05). If unsure, keep as-is.
3. Use sample data values to understand what the column actually contains — column names can be misleading.
4. Each schema field can only be assigned to ONE column. If two columns map to the same field, pick the better one and null the other.

Return JSON: { "column_name": { "field": "<schema_field_or_null>", "confidence": <0.0-1.0>, "reason": "<one short sentence>" } }`,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    },
  });

  let result: AiMappingResult = {};
  try {
    result = JSON.parse(response.choices[0].message.content ?? "{}") as AiMappingResult;
  } catch {
    // Return empty on parse failure — caller treats as unmapped
  }

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), { ex: 86400 });
  }

  return result;
}

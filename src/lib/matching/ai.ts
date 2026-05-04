import { createLoggedChatCompletion } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage-log";

const SCHEMA_DESCRIPTION = `
student_name       — student's full name
contact_info       — phone number, email, or WhatsApp contact
join_date          — date the student enrolled or started
last_session_date  — date of the most recent class or session attended
attendance_rate    — attendance percentage or count (e.g. 85%, 17/20)
last_payment_date  — date of the most recent payment received
payment_status     — payment state (paid, unpaid, overdue, etc.)
total_sessions     — total number of sessions/classes held or attended
fees_amount        — fee amount charged (monthly, per session, etc.)
subject            — subject, course, or class name
tutor_assigned     — name of the assigned tutor or teacher
notes              — any remarks, comments, or additional information
`.trim();

type AiMappingResult = Record<string, { field: string | null; confidence: number }>;

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
  uploadId: string
): Promise<AiMappingResult> {
  if (!unmappedColumns.length) return {};

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

  const columnsText = unmappedColumns
    .map(({ column, samples }) => {
      const sampleStr = samples.filter(Boolean).slice(0, 3).join(" | ") || "(empty)";
      return `- "${column}" → samples: ${sampleStr}`;
    })
    .join("\n");

  const model = "gpt-4o-mini";
  const response = await createLoggedChatCompletion({
    uploadId,
    feature: "column_mapping",
    model,
    payloadForHash: { unmappedColumns },
    request: {
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You map spreadsheet column names to a fixed student database schema.
Schema fields:
${SCHEMA_DESCRIPTION}

Return JSON: { "column_name": { "field": "<schema_field_or_null>", "confidence": <0.5-0.9> } }
If no field fits, use null with confidence 0.`,
        },
        {
          role: "user",
          content: `Map these columns:\n${columnsText}`,
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

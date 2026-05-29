import { createLoggedChatCompletion } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage-log";
import { getImportFields, getRequiredField } from "@/lib/imports/schema";
import type { EntityType } from "@/lib/imports/types";

// Build the schema field list from the fields that THIS entity actually accepts,
// so the model never maps to a field the merge step will silently drop.
function buildSchemaDescription(entityType: EntityType): string {
  const requiredField = getRequiredField(entityType);
  return getImportFields(entityType)
    .map((f) => {
      const flag = f.value === requiredField ? " (REQUIRED — every upload must have this)" : "";
      return `${f.value} — ${f.desc}${flag}`;
    })
    .join("\n");
}

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
  alreadyMapped: { column: string; field: string; layer: "exact" | "fuzzy"; samples: string[] }[] = [],
  entityType: EntityType = "students"
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

Schema fields (with descriptions) — map ONLY to these fields, return null for anything that does not fit one of them:
${buildSchemaDescription(entityType)}

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

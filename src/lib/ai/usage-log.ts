import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AiUsageStatus = "success" | "error" | "cache_hit";

export type AiUsageInput = {
  academyId?: string | null;
  uploadId?: string | null;
  feature: "column_mapping" | "risk_scoring";
  model: string;
  payloadForHash: unknown;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cacheHit?: boolean;
  status: AiUsageStatus;
  errorCode?: string | null;
  latencyMs: number;
  metadata?: Record<string, unknown>;
};

export function hashAiPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function logAiUsage(input: AiUsageInput): Promise<void> {
  const requestHash = hashAiPayload(input.payloadForHash);
  const row = {
    academyId: input.academyId ?? null,
    uploadId: input.uploadId ?? null,
    feature: input.feature,
    model: input.model,
    requestHash,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    cacheHit: input.cacheHit ?? false,
    status: input.status,
    errorCode: input.errorCode ?? null,
    latencyMs: input.latencyMs,
    metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
  };

  await prisma.aiUsageLog.create({ data: row });

  if (process.env.AI_USAGE_FILE_LOG === "true") {
    const filePath = process.env.AI_USAGE_LOG_PATH ?? "logs/ai-usage.jsonl";
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(
      filePath,
      JSON.stringify({ ...row, createdAt: new Date().toISOString() }) + "\n",
      "utf8"
    );
  }
}

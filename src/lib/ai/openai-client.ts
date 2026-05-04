import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { logAiUsage } from "./usage-log";

let client: OpenAI | null = null;

export function getOpenAiClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function createLoggedChatCompletion(args: {
  academyId?: string | null;
  uploadId?: string | null;
  feature: "column_mapping" | "risk_scoring";
  model: string;
  payloadForHash: unknown;
  request: Omit<ChatCompletionCreateParamsNonStreaming, "model"> & { model?: string };
}): Promise<ChatCompletion> {
  const started = Date.now();

  try {
    const response = await getOpenAiClient().chat.completions.create({
      ...args.request,
      model: args.request.model ?? args.model,
    });

    await logAiUsage({
      academyId: args.academyId,
      uploadId: args.uploadId,
      feature: args.feature,
      model: args.model,
      payloadForHash: args.payloadForHash,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      status: "success",
      latencyMs: Date.now() - started,
      metadata: { choiceCount: response.choices.length },
    });

    return response;
  } catch (error) {
    await logAiUsage({
      academyId: args.academyId,
      uploadId: args.uploadId,
      feature: args.feature,
      model: args.model,
      payloadForHash: args.payloadForHash,
      status: "error",
      errorCode: error instanceof Error ? error.name : "UnknownError",
      latencyMs: Date.now() - started,
    });
    throw error;
  }
}

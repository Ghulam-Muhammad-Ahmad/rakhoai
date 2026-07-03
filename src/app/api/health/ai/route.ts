import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/ai/openai-client";

// Live check that the configured AI model actually answers — catches a dead /
// renamed model (e.g. a provider 5xx) on every deployment. Kept tiny (1 token).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Optional shared-secret gate: if HEALTH_CHECK_TOKEN is set, require ?token=.
  const secret = process.env.HEALTH_CHECK_TOKEN;
  if (secret && req.nextUrl.searchParams.get("token") !== secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  try {
    const res = await getOpenAiClient().chat.completions.create({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    const ok = Boolean(res.choices?.length);
    return NextResponse.json({ ok, model }, { status: ok ? 200 : 503 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, model, error: err instanceof Error ? err.message : "unknown" },
      { status: 503 },
    );
  }
}

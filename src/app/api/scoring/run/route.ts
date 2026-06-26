import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { runStructuredRiskScoring } from "@/lib/scoring/structured";
import { checkAiRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const limit = await checkAiRateLimit(dbUser.academy.id);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  // Optional uploadId ties the resulting RiskAssessment rows back to the import
  // that triggered the run (audit trail / per-upload AI cost tracking).
  let uploadId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.uploadId === "string") uploadId = body.uploadId;
  } catch {
    // no body — manual run with no upload context
  }

  try {
    const result = await runStructuredRiskScoring(dbUser.academy.id, uploadId, sb);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to run risk scoring",
    }, { status: 400 });
  }
}

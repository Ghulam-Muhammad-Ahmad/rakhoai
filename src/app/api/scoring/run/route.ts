import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { runStructuredRiskScoring } from "@/lib/scoring/structured";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  try {
    const result = await runStructuredRiskScoring(dbUser.academy.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to run risk scoring",
    }, { status: 400 });
  }
}

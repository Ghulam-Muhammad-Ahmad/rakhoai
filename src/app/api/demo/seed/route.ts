import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { academyHasStudents, deleteDemoData, seedDemoData } from "@/lib/demo/seed";
import { runStructuredRiskScoring } from "@/lib/scoring/structured";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  try {
    // Demo data is only for empty academies — never mix with real student data.
    if (await academyHasStudents(dbUser.academy.id)) {
      return NextResponse.json({ error: "Academy already has students" }, { status: 409 });
    }

    const created = await seedDemoData(dbUser.academy.id);

    // Score immediately so the dashboard lights up without an extra step.
    let scored = false;
    try {
      await runStructuredRiskScoring(dbUser.academy.id, null);
      scored = true;
    } catch {
      // seeding succeeded; user can still trigger scoring from the dashboard
    }

    return NextResponse.json({ ...created, scored });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to load demo data",
    }, { status: 400 });
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  try {
    const removed = await deleteDemoData(dbUser.academy.id);
    return NextResponse.json(removed);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to remove demo data",
    }, { status: 400 });
  }
}

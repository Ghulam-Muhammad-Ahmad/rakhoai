import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { unassignTutorsForAcademy } from "@/lib/deletions/bulk-delete";
import { normalizeDeleteNames } from "@/lib/deletions/bulk-delete-core";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const names = normalizeDeleteNames(body?.names);
  if (names.length === 0) return NextResponse.json({ error: "At least one tutor name is required" }, { status: 400 });

  try {
    const result = await unassignTutorsForAcademy(dbUser.academy.id, names);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete tutors";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

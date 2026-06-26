import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getUserDb } from "@/lib/db/user-client";
import { deleteSessionsForAcademy } from "@/lib/deletions/bulk-delete";
import { normalizeDeleteIds } from "@/lib/deletions/bulk-delete-core";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const ids = normalizeDeleteIds(body?.ids);
  if (ids.length === 0) return NextResponse.json({ error: "At least one session id is required" }, { status: 400 });

  try {
    const result = await deleteSessionsForAcademy(dbUser.academy.id, ids, sb);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete sessions";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

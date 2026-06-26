import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getDashboardSummary } from "@/lib/dashboard/summary";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);

  if (!dbUser?.academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  return NextResponse.json(await getDashboardSummary(dbUser.academy.id, new Date(), sb));
}

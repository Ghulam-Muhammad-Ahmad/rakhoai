import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const academyId = await getAcademyIdForSupabaseUser(user.id, sb);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const { data: active } = await sb
    .from("Upload")
    .select("id, fileName, status, uploadedAt")
    .eq("academyId", academyId)
    .eq("status", "PROCESSING")
    .order("uploadedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    hasActiveJob: !!active,
    upload: active ?? null,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const academyId = await getAcademyIdForSupabaseUser(user.id, sb);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const { count, error } = await sb
    .from("Student")
    .select("id", { count: "exact", head: true })
    .eq("academyId", academyId);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // Prior processed uploads of a given entity type — used to decide whether the
  // import-mode (add/replace) dialog is meaningful. No prior import = nothing to
  // replace, so the dialog is skipped.
  const entityType = req.nextUrl.searchParams.get("entityType");
  let priorImportsForEntity = 0;
  if (entityType) {
    const { count: priorCount } = await sb
      .from("Upload")
      .select("id", { count: "exact", head: true })
      .eq("academyId", academyId)
      .eq("entityType", entityType as "students" | "teachers" | "sessions" | "payments")
      .eq("status", "PROCESSED");
    priorImportsForEntity = priorCount ?? 0;
  }

  const { data: lastUpload } = await sb
    .from("Upload")
    .select("processedAt, fileName")
    .eq("academyId", academyId)
    .eq("status", "PROCESSED")
    .order("processedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    hasStudents: (count ?? 0) > 0,
    studentCount: count ?? 0,
    priorImportsForEntity,
    lastUploadAt: lastUpload?.processedAt ?? null,
    lastFileName: lastUpload?.fileName ?? null,
  });
}

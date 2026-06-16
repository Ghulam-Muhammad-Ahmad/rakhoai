import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const academyId = await getAcademyIdForSupabaseUser(user.id);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const { count, error } = await db
    .from("Student")
    .select("id", { count: "exact", head: true })
    .eq("academyId", academyId);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: lastUpload } = await db
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
    lastUploadAt: lastUpload?.processedAt ?? null,
    lastFileName: lastUpload?.fileName ?? null,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";
import { processMappedUpload } from "@/lib/scoring/process-upload";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const academyId = await getAcademyIdForSupabaseUser(user.id);
  if (!academyId) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  try {
    const result = await processMappedUpload(id, academyId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const academyId = await getAcademyIdForSupabaseUser(user.id);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upload } = await (db as any)
    .from("Upload")
    .select("id, status, rowCount, processedAt, fileName, entityType, reviewJson")
    .eq("id", id)
    .eq("academyId", academyId)
    .maybeSingle() as { data: {
      id: string;
      status: string;
      rowCount: number | null;
      processedAt: string | null;
      fileName: string;
      entityType?: string;
      reviewJson?: unknown;
    } | null };

  if (!upload) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    status: upload.status,
    rowCount: upload.rowCount,
    processedAt: upload.processedAt,
    fileName: upload.fileName,
    entityType: (upload as { entityType?: string }).entityType,
    review: (upload as { reviewJson?: unknown }).reviewJson,
  });
}

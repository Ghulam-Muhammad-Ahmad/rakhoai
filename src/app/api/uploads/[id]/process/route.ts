import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";
import { processStructuredUpload } from "@/lib/imports/process-upload";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const academyId = await getAcademyIdForSupabaseUser(user.id);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  let mode: "update" | "replace" = "update";
  try {
    const body = await req.json();
    if (body?.mode === "replace") mode = "replace";
  } catch {
    // no body — default update
  }

  const { data: upload } = await db
    .from("Upload")
    .select("id, status, academyId")
    .eq("id", id)
    .maybeSingle();

  if (!upload || upload.academyId !== academyId) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }
  if (upload.status === "PROCESSING") {
    return NextResponse.json({ status: "PROCESSING" }, { status: 202 });
  }
  if (upload.status === "PROCESSED") {
    return NextResponse.json({ status: "PROCESSED" });
  }
  if (upload.status !== "MAPPED") {
    return NextResponse.json({ error: "Upload must be mapped before processing" }, { status: 400 });
  }

  // Atomically flip MAPPED -> PROCESSING. The WHERE on status closes the TOCTOU
  // window: only one concurrent request wins; the rest get no row back.
  const { data: claimed } = await db
    .from("Upload")
    .update({ status: "PROCESSING" })
    .eq("id", id)
    .eq("status", "MAPPED")
    .select("id")
    .maybeSingle();
  if (!claimed) {
    return NextResponse.json({ status: "PROCESSING" }, { status: 202 });
  }

  // Score in background — returns 202 immediately
  after(async () => {
    try {
      // Cap the background job so a hung dependency can't pin the upload in
      // PROCESSING forever — surface as FAILED after 5 minutes.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Scoring timeout")), 300_000)
      );
      await Promise.race([processStructuredUpload(id, academyId, mode), timeout]);
    } catch (err) {
      console.error("Background scoring failed for upload", id, err);
      await db.from("Upload").update({ status: "FAILED" }).eq("id", id);
    }
  });

  return NextResponse.json({ status: "PROCESSING" }, { status: 202 });
}

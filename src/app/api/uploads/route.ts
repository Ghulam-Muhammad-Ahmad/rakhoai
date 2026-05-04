import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";
import { parseFile } from "@/lib/parsers";
import crypto from "node:crypto";

const ALLOWED_TYPES = ["csv", "xlsx", "xls"];
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_MB = MAX_BYTES / 1024 / 1024;

function getAdminStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const academyId = await getAcademyIdForSupabaseUser(user.id);
  if (!academyId) {
    return NextResponse.json({ error: "Academy not found" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_MB} MB limit` }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = await parseFile(buffer, file.name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const uploadId = crypto.randomUUID();

  const { error: insertError } = await db.from("Upload").insert({
    id: uploadId,
    academyId,
    fileName: file.name,
    status: "PENDING",
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to create upload record" }, { status: 500 });
  }

  const storagePath = `${academyId}/${uploadId}/${file.name}`;
  const adminClient = getAdminStorageClient();
  const { error: storageError } = await adminClient.storage
    .from("uploads")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageError) {
    console.error("Storage upload failed:", storageError.message);
    await db.from("Upload").update({ status: "FAILED" }).eq("id", uploadId);
    return NextResponse.json({ error: "Failed to store uploaded file" }, { status: 502 });
  }

  const { data: updated, error: updateError } = await db
    .from("Upload")
    .update({
      fileUrl: storagePath,
      status: "PREVIEW_READY",
      rowCount: parsed.totalRows,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows as unknown as import("@/lib/db/database.types").Json,
      rawRowsJson: parsed.rows as unknown as import("@/lib/db/database.types").Json,
    })
    .eq("id", uploadId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Failed to update upload record" }, { status: 500 });
  }

  return NextResponse.json(
    {
      uploadId,
      fileName: updated?.fileName ?? file.name,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows,
      totalRows: parsed.totalRows,
      warnings: parsed.warnings,
    },
    { status: 201 }
  );
}

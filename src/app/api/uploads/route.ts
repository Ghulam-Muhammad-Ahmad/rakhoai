import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { parseFile } from "@/lib/parsers";

const ALLOWED_TYPES = ["csv", "xlsx", "xls"];
const MAX_BYTES = 4 * 1024 * 1024; // Keep multipart uploads below Vercel Route Handler limits.
const MAX_MB = MAX_BYTES / 1024 / 1024;

// Service-role client bypasses Storage RLS for server-side uploads
function getAdminStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { academy: true },
  });

  if (!dbUser?.academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_MB} MB limit` },
      { status: 400 }
    );
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

  // Create Upload record first to get ID for storage path
  const upload = await prisma.upload.create({
    data: {
      academyId: dbUser.academy.id,
      fileName: file.name,
      status: "PENDING",
    },
  });

  // Upload raw file to Supabase Storage using service-role key
  const storagePath = `${dbUser.academy.id}/${upload.id}/${file.name}`;
  const adminClient = getAdminStorageClient();
  const { error: storageError } = await adminClient.storage
    .from("uploads")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageError) {
    console.error("Storage upload failed:", storageError.message);
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: "Failed to store uploaded file" },
      { status: 502 }
    );
  }

  const updated = await prisma.upload.update({
    where: { id: upload.id },
    data: {
      fileUrl: storagePath,
      status: "PREVIEW_READY",
      rowCount: parsed.totalRows,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows,
    },
  });

  return NextResponse.json(
    {
      uploadId: updated.id,
      fileName: updated.fileName,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows,
      totalRows: parsed.totalRows,
      warnings: parsed.warnings,
    },
    { status: 201 }
  );
}

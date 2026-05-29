import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";
import { parseFile } from "@/lib/parsers";
import { detectImportFormat } from "@/lib/imports/formats";
import type { EntityType } from "@/lib/imports/types";
import crypto from "node:crypto";

const ALLOWED_TYPES = ["csv", "xlsx", "xls"];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_MB = MAX_BYTES / 1024 / 1024;
const ENTITY_TYPES: EntityType[] = ["students", "teachers", "sessions", "payments"];

function getAdminStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getOrCreateOpenImportSet(academyId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("ImportSet")
    .select("id")
    .eq("academyId", academyId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) return existing.id;

  const id = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from("ImportSet").insert({
    id,
    academyId,
    name: `Import set ${new Date().toISOString().slice(0, 10)}`,
  }) as { error: { message: string } | null };
  if (error) throw new Error(`Failed to create import set: ${error.message}`);
  return id;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const academyId = await getAcademyIdForSupabaseUser(user.id);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 400 });

  // Block if a scoring job is already running
  const { data: activeJob } = await db
    .from("Upload")
    .select("id, fileName")
    .eq("academyId", academyId)
    .eq("status", "PROCESSING")
    .limit(1)
    .maybeSingle();

  if (activeJob) {
    return NextResponse.json({
      error: `A scoring job is in progress for "${activeJob.fileName}". Wait for it to finish before uploading new data.`,
      activeUploadId: activeJob.id,
      blocked: true,
    }, { status: 409 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  const requestedEntityType = String(formData.get("entityType") ?? "students");
  const entityType = ENTITY_TYPES.includes(requestedEntityType as EntityType)
    ? requestedEntityType as EntityType
    : "students";
  const importSetIdFromForm = String(formData.get("importSetId") ?? "").trim();

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

  const detection = detectImportFormat(entityType, parsed.headers);
  if (!detection.supported) {
    return NextResponse.json({
      error: detection.warnings[0] ?? "Unsupported file format",
      detection,
    }, { status: 400 });
  }

  if (entityType === "sessions" || entityType === "payments") {
    const { count } = await db
      .from("Student")
      .select("id", { count: "exact", head: true })
      .eq("academyId", academyId);
    if ((count ?? 0) === 0) {
      return NextResponse.json({
        error: "Upload students before importing sessions or payments.",
        blockedReason: "students_required",
      }, { status: 409 });
    }
  }

  const uploadId = crypto.randomUUID();
  let importSetId = importSetIdFromForm;
  try {
    importSetId = importSetId || await getOrCreateOpenImportSet(academyId);
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to prepare import set",
    }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (db as any).from("Upload").insert({
    id: uploadId,
    academyId,
    importSetId,
    entityType,
    formatType: detection.format,
    fileName: file.name,
    status: "PENDING",
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to create upload record" }, { status: 500 });
  }

  // Sanitize the user-supplied filename before it touches the storage path —
  // strips path separators / null bytes so a crafted name can't traverse.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
  const storagePath = `${academyId}/${uploadId}/${safeName}`;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (db as any)
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

  const warnings = [...(parsed.warnings ?? [])];
  warnings.push(...detection.warnings);

  const statusColumn = `${entityType}Status`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("ImportSet").update({
    [statusColumn]: "uploaded",
    updatedAt: new Date().toISOString(),
  }).eq("id", importSetId);

  return NextResponse.json(
    {
      uploadId,
      importSetId,
      entityType,
      formatType: detection.format,
      detection,
      fileName: updated?.fileName ?? file.name,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows,
      totalRows: parsed.totalRows,
      warnings,
    },
    { status: 201 }
  );
}

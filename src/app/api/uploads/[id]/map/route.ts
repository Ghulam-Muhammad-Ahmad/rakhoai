import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";
import { runMapping, MappingResult } from "@/lib/matching";
import type { Json } from "@/lib/db/database.types";
import { z } from "zod";
import crypto from "node:crypto";
import { processMappedUpload } from "@/lib/scoring/process-upload";

type Params = { params: Promise<{ id: string }> };

async function getAuthorizedUpload(uploadId: string, supabaseUserId: string) {
  const academyId = await getAcademyIdForSupabaseUser(supabaseUserId);
  if (!academyId) return null;

  const { data: upload } = await db
    .from("Upload")
    .select("*")
    .eq("id", uploadId)
    .maybeSingle();

  if (!upload || upload.academyId !== academyId) return null;
  return { upload, academyId };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academyId } = ctx;

  const { data: templates, error: templatesError } = await db
    .from("ColumnMapping")
    .select("id, name, isDefault, mappingJson")
    .eq("academyId", academyId)
    .order("isDefault", { ascending: false })
    .order("createdAt", { ascending: false });

  if (templatesError) return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });

  return NextResponse.json({
    uploadId: upload.id,
    fileName: upload.fileName,
    status: upload.status,
    mappings: (upload.mappingJson as MappingResult[] | null) ?? [],
    templates: templates ?? [],
  });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academyId } = ctx;

  if (!upload.headers || !upload.sampleRows) {
    return NextResponse.json({ error: "Upload not yet parsed" }, { status: 400 });
  }

  const headers = upload.headers as string[];
  const sampleRows = upload.sampleRows as Record<string, string>[];

  const { data: defaultTemplate } = await db
    .from("ColumnMapping")
    .select("mappingJson")
    .eq("academyId", academyId)
    .eq("isDefault", true)
    .maybeSingle();

  const templateMap = defaultTemplate
    ? (defaultTemplate.mappingJson as Record<string, string | null>)
    : null;

  const mappings = await runMapping(headers, sampleRows, upload.id, templateMap);

  const { error: updateError } = await db
    .from("Upload")
    .update({ mappingJson: mappings as unknown as Json })
    .eq("id", upload.id);

  if (updateError) return NextResponse.json({ error: "Failed to save mappings" }, { status: 500 });

  return NextResponse.json({ mappings });
}

const PatchSchema = z.object({
  mappings: z.array(
    z.object({
      sourceColumn: z.string(),
      targetField: z.string().nullable(),
    })
  ),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().optional(),
  setAsDefault: z.boolean().optional(),
  processNow: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academyId } = ctx;

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const hasStudentName = body.mappings.some((m) => m.targetField === "student_name");
  if (!hasStudentName) {
    return NextResponse.json(
      { error: "student_name field must be mapped before confirming" },
      { status: 400 }
    );
  }

  const existing = (upload.mappingJson as MappingResult[] | null) ?? [];
  const overrideMap = Object.fromEntries(
    body.mappings.map((m) => [m.sourceColumn, m.targetField])
  );

  const updated: MappingResult[] = existing.map((m) =>
    m.sourceColumn in overrideMap
      ? { ...m, suggestedField: overrideMap[m.sourceColumn], layer: "exact" as const, confidence: 1.0 }
      : m
  );

  const { error: updateError } = await db
    .from("Upload")
    .update({ mappingJson: updated as unknown as Json, status: "MAPPED" })
    .eq("id", upload.id);

  if (updateError) return NextResponse.json({ error: "Failed to confirm mapping" }, { status: 500 });

  if (body.saveAsTemplate && body.templateName) {
    const templateJson = Object.fromEntries(
      body.mappings.map((m) => [m.sourceColumn, m.targetField])
    );

    if (body.setAsDefault) {
      await db
        .from("ColumnMapping")
        .update({ isDefault: false })
        .eq("academyId", academyId)
        .eq("isDefault", true);
    }

    const { error: templateError } = await db.from("ColumnMapping").insert({
      id: crypto.randomUUID(),
      academyId,
      name: body.templateName,
      mappingJson: templateJson as unknown as Json,
      isDefault: body.setAsDefault ?? false,
    });

    if (templateError) {
      console.error("Failed to save template:", templateError.message);
    }
  }

  if (body.processNow) {
    try {
      const processing = await processMappedUpload(upload.id, academyId);
      return NextResponse.json({
        mappings: updated,
        status: "PROCESSED",
        processing,
      });
    } catch (error) {
      return NextResponse.json(
        {
          mappings: updated,
          status: "MAPPED",
          error: error instanceof Error ? error.message : "Processing failed",
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ mappings: updated, status: "MAPPED" });
}

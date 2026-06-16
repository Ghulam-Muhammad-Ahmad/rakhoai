import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";
import { runMapping, MappingResult } from "@/lib/matching";
import { getIdentifierQuality } from "@/lib/imports/identifiers";
import { getImportFields, getRequiredField } from "@/lib/imports/schema";
import type { EntityType } from "@/lib/imports/types";
import type { Json } from "@/lib/db/database.types";
import { z } from "zod";
import crypto from "node:crypto";
import { processStructuredUpload } from "@/lib/imports/process-upload";

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
  return { upload: upload as typeof upload & Record<string, unknown>, academyId };
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
    entityType: upload.entityType ?? "students",
    formatType: upload.formatType ?? null,
    identifier: upload.identifierJson ?? null,
    fields: getImportFields((upload.entityType ?? "students") as EntityType),
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

  // Migrate legacy 'contact_info' field in saved templates. Before the schema split,
  // a single 'contact_info' field covered both email and phone. Templates saved under
  // the old schema would be silently dropped by runMapping (not in allowedFields).
  // Default to 'email' as the safer/more common case.
  if (templateMap) {
    for (const col of Object.keys(templateMap)) {
      if (templateMap[col] === 'contact_info') templateMap[col] = 'email'
    }
  }

  const entityType = (upload.entityType ?? "students") as EntityType;
  const mappings = await runMapping(headers, sampleRows, upload.id, templateMap, entityType);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (db as any)
    .from("Upload")
    .update({ mappingJson: mappings as unknown as Json })
    .eq("id", upload.id);

  if (updateError) return NextResponse.json({ error: "Failed to save mappings" }, { status: 500 });

  return NextResponse.json({
    mappings,
    entityType,
    formatType: upload.formatType ?? null,
    fields: getImportFields(entityType),
    identifier: upload.identifierJson ?? null,
  });
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
  identifierColumn: z.string().nullable().optional(),
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

  const entityType = (upload.entityType ?? "students") as EntityType;
  const requiredField = getRequiredField(entityType);
  const hasRequiredField = body.mappings.some((m) => m.targetField === requiredField);
  if (!hasRequiredField) {
    return NextResponse.json(
      { error: `${requiredField} field must be mapped before confirming` },
      { status: 400 }
    );
  }

  const identifierColumn =
    body.identifierColumn ??
    body.mappings.find((m) => ["student_identifier", "email", "phone", "student_name"].includes(m.targetField ?? ""))?.sourceColumn ??
    null;
  const identifierMapping = identifierColumn
    ? body.mappings.find((m) => m.sourceColumn === identifierColumn) ?? null
    : null;
  const identifierJson = identifierColumn && identifierMapping?.targetField
    ? {
        sourceColumn: identifierColumn,
        targetField: identifierMapping.targetField,
        quality: getIdentifierQuality(identifierMapping.targetField === "student_identifier" ? identifierColumn : identifierMapping.targetField),
      }
    : null;

  if ((entityType === "sessions" || entityType === "payments") && !identifierJson) {
    return NextResponse.json(
      { error: "Choose a Student Identifier before confirming sessions or payments." },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (db as any)
    .from("Upload")
    .update({ mappingJson: updated as unknown as Json, identifierJson: identifierJson as unknown as Json, status: "MAPPED" })
    .eq("id", upload.id);

  if (updateError) return NextResponse.json({ error: "Failed to confirm mapping" }, { status: 500 });
  if (upload.importSetId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("ImportSet").update({
      [`${entityType}Status`]: "mapped",
      updatedAt: new Date().toISOString(),
    }).eq("id", upload.importSetId);
  }

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
      const processing = await processStructuredUpload(upload.id, academyId);
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

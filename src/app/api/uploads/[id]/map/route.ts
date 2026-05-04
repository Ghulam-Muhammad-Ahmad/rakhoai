import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { runMapping, MappingResult } from "@/lib/matching";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

async function getAuthorizedUpload(uploadId: string, supabaseUserId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUserId },
    include: { academy: true },
  });
  if (!dbUser?.academy) return null;

  const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
  if (!upload || upload.academyId !== dbUser.academy.id) return null;

  return { upload, academy: dbUser.academy };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academy } = ctx;

  const templates = await prisma.columnMapping.findMany({
    where: { academyId: academy.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, isDefault: true, mappingJson: true },
  });

  return NextResponse.json({
    uploadId: upload.id,
    fileName: upload.fileName,
    status: upload.status,
    mappings: (upload.mappingJson as MappingResult[] | null) ?? [],
    templates,
  });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academy } = ctx;

  if (!upload.headers || !upload.sampleRows) {
    return NextResponse.json({ error: "Upload not yet parsed" }, { status: 400 });
  }

  const headers = upload.headers as string[];
  const sampleRows = upload.sampleRows as Record<string, string>[];

  // Check for default template to pre-fill
  const defaultTemplate = await prisma.columnMapping.findFirst({
    where: { academyId: academy.id, isDefault: true },
  });

  const templateMap = defaultTemplate
    ? (defaultTemplate.mappingJson as Record<string, string | null>)
    : null;

  const mappings = await runMapping(headers, sampleRows, upload.id, templateMap);

  await prisma.upload.update({
    where: { id: upload.id },
    data: { mappingJson: mappings as object[] },
  });

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
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getAuthorizedUpload(id, user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { upload, academy } = ctx;

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // student_name must be mapped
  const hasStudentName = body.mappings.some((m) => m.targetField === "student_name");
  if (!hasStudentName) {
    return NextResponse.json(
      { error: "student_name field must be mapped before confirming" },
      { status: 400 }
    );
  }

  // Merge manual overrides into existing mapping results
  const existing = (upload.mappingJson as MappingResult[] | null) ?? [];
  const overrideMap = Object.fromEntries(
    body.mappings.map((m) => [m.sourceColumn, m.targetField])
  );

  const updated: MappingResult[] = existing.map((m) =>
    m.sourceColumn in overrideMap
      ? { ...m, suggestedField: overrideMap[m.sourceColumn], layer: "exact" as const, confidence: 1.0 }
      : m
  );

  await prisma.upload.update({
    where: { id: upload.id },
    data: { mappingJson: updated as object[], status: "MAPPED" },
  });

  // Save as reusable template
  if (body.saveAsTemplate && body.templateName) {
    const templateJson = Object.fromEntries(
      body.mappings.map((m) => [m.sourceColumn, m.targetField])
    );

    if (body.setAsDefault) {
      await prisma.columnMapping.updateMany({
        where: { academyId: academy.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.columnMapping.create({
      data: {
        academyId: academy.id,
        name: body.templateName,
        mappingJson: templateJson,
        isDefault: body.setAsDefault ?? false,
      },
    });
  }

  return NextResponse.json({ mappings: updated, status: "MAPPED" });
}

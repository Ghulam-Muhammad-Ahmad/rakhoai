import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { runMapping, MappingResult } from "@/lib/matching";
import { MappingReview } from "@/components/mapping/MappingReview";

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { academy: true },
  });
  if (!dbUser?.academy) redirect("/onboarding");

  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload || upload.academyId !== dbUser.academy.id) redirect("/dashboard");

  if (!upload.headers || !upload.sampleRows) redirect("/uploads/new");

  const headers = upload.headers as string[];
  const sampleRows = upload.sampleRows as Record<string, string>[];

  let mappings = upload.mappingJson as MappingResult[] | null;

  // Auto-run mapping if not done yet
  if (!mappings || mappings.length === 0) {
    const defaultTemplate = await prisma.columnMapping.findFirst({
      where: { academyId: dbUser.academy.id, isDefault: true },
    });
    const templateMap = defaultTemplate
      ? (defaultTemplate.mappingJson as Record<string, string | null>)
      : null;

    mappings = await runMapping(headers, sampleRows, upload.id, templateMap);

    await prisma.upload.update({
      where: { id: upload.id },
      data: { mappingJson: mappings as object[] },
    });
  }

  const templates = await prisma.columnMapping.findMany({
    where: { academyId: dbUser.academy.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, isDefault: true, mappingJson: true },
  });

  return (
    <div className="page-fade" style={{ padding: "32px 24px" }}>
      <MappingReview
        uploadId={upload.id}
        initialMappings={mappings}
        templates={templates}
      />
    </div>
  );
}

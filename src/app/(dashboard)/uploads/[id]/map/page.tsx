import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { db } from "@/lib/db/client";
import type { Json } from "@/lib/db/database.types";
import { runMapping, MappingResult } from "@/lib/matching";
import { MappingReview } from "@/components/mapping/MappingReview";

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser?.academy) redirect("/onboarding");

  const { data: upload, error: uploadError } = await db
    .from("Upload")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (uploadError) redirect("/dashboard");
  if (!upload || upload.academyId !== dbUser.academy.id) redirect("/dashboard");

  if (!upload.headers || !upload.sampleRows) redirect("/uploads/new");

  const headers = upload.headers as string[];
  const sampleRows = upload.sampleRows as Record<string, string>[];

  let mappings = upload.mappingJson as MappingResult[] | null;

  // Auto-run mapping if not done yet
  if (!mappings || mappings.length === 0) {
    const { data: defaultTemplate } = await db
      .from("ColumnMapping")
      .select("mappingJson")
      .eq("academyId", dbUser.academy.id)
      .eq("isDefault", true)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    const templateMap = defaultTemplate
      ? (defaultTemplate.mappingJson as Record<string, string | null>)
      : null;

    mappings = await runMapping(headers, sampleRows, upload.id, templateMap);

    await db
      .from("Upload")
      .update({ mappingJson: mappings as unknown as Json })
      .eq("id", upload.id);
  }

  const { data: templates } = await db
    .from("ColumnMapping")
    .select("id, name, isDefault, mappingJson")
    .eq("academyId", dbUser.academy.id)
    .order("isDefault", { ascending: false })
    .order("createdAt", { ascending: false });

  return (
    <div className="page-fade" style={{ padding: "32px 24px" }}>
      <MappingReview
        uploadId={upload.id}
        initialMappings={mappings}
        templates={templates ?? []}
      />
    </div>
  );
}

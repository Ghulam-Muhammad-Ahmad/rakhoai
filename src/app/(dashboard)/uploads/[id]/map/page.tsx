import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { db } from "@/lib/db/client";
import { UploadStepper } from "@/components/upload/UploadStepper";
import { MappingLoader } from "@/components/mapping/MappingLoader";
import { detectImportFormat } from "@/lib/imports/formats";
import { getIdentifierQuality } from "@/lib/imports/identifiers";
import type { EntityType } from "@/lib/imports/types";

function label(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser?.academy) redirect("/onboarding");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upload } = await (db as any)
    .from("Upload")
    .select("id, academyId, status, headers, sampleRows, rawRowsJson, rowCount, entityType, formatType, identifierJson")
    .eq("id", id)
    .maybeSingle() as { data: {
      id: string;
      academyId: string;
      status: string;
      headers: unknown;
      sampleRows: unknown;
      rawRowsJson: unknown;
      rowCount: number | null;
      entityType?: EntityType;
      formatType?: string | null;
      identifierJson?: unknown;
    } | null };

  if (!upload || upload.academyId !== dbUser.academy.id) redirect("/dashboard");
  if (!upload.headers || !upload.sampleRows) redirect("/uploads/new");

  const uploadWithStructuredFields = upload as typeof upload & { entityType?: EntityType; formatType?: string | null; identifierJson?: unknown };
  const headers = (upload.headers as string[] | null) ?? [];
  const entityType = (uploadWithStructuredFields.entityType ?? "students") as EntityType;
  const detected = detectImportFormat(entityType, headers);
  const identifierCandidate = headers.find((header) => getIdentifierQuality(header).level === "high") ??
    headers.find((header) => getIdentifierQuality(header).level === "medium") ??
    headers.find((header) => getIdentifierQuality(header).level === "low") ??
    null;
  const identifierQuality = identifierCandidate ? getIdentifierQuality(identifierCandidate) : null;
  const rawRows = (upload.rawRowsJson as unknown[] | null) ?? [];
  const rowCount = upload.rowCount ?? rawRows.length;

  const { data: templates } = await db
    .from("ColumnMapping")
    .select("id, name, isDefault, mappingJson")
    .eq("academyId", dbUser.academy.id)
    .order("isDefault", { ascending: false })
    .order("createdAt", { ascending: false });

  return (
    <div className="page-fade">
      <UploadStepper currentStep="map" />
      <div style={{ maxWidth: 960, margin: "18px auto 20px", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, padding: 16, border: "1px solid var(--neutral-200)", borderRadius: 10, background: "#fff" }}>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 700 }}>Detected entity</div>
          <div style={{ marginTop: 4, fontSize: 14, color: "var(--neutral-900)", fontWeight: 600 }}>{label(entityType)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 700 }}>Format</div>
          <div style={{ marginTop: 4, fontSize: 14, color: detected.supported ? "#0F766E" : "#B45309", fontWeight: 600 }}>{label(uploadWithStructuredFields.formatType ?? detected.format)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 700 }}>Rows found</div>
          <div style={{ marginTop: 4, fontSize: 14, color: "var(--neutral-900)", fontWeight: 600 }}>{rowCount.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 700 }}>Identifier candidate</div>
          <div style={{ marginTop: 4, fontSize: 14, color: "var(--neutral-900)", fontWeight: 600 }}>{identifierCandidate ?? "Choose in mapping"}</div>
          {identifierQuality && <div style={{ marginTop: 2, fontSize: 12, color: identifierQuality.level === "high" ? "#0F766E" : "#B45309" }}>{label(identifierQuality.level)} confidence</div>}
        </div>
        {detected.warnings.length > 0 && (
          <div style={{ gridColumn: "1 / -1", paddingTop: 10, borderTop: "1px solid var(--neutral-100)", fontSize: 13, color: "#92400E" }}>
            {detected.warnings.join(" ")}
          </div>
        )}
      </div>
      <MappingLoader uploadId={upload.id} templates={templates ?? []} />
    </div>
  );
}

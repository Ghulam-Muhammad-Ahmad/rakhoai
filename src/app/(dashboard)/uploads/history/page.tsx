import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { db } from "@/lib/db/client";
import type { EntityType, ImportReviewSummary } from "@/lib/imports/types";

type EntityStatus = "missing" | "mapped" | "imported" | "reviewed";

type ImportSetRow = {
  id: string;
  name: string;
  studentsStatus: EntityStatus;
  teachersStatus: EntityStatus;
  sessionsStatus: EntityStatus;
  paymentsStatus: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

type UploadHistoryRow = {
  id: string;
  importSetId: string | null;
  fileName: string;
  entityType: EntityType | null;
  status: string;
  processedAt: string | null;
  uploadedAt: string;
  rowCount: number | null;
  reviewJson: ImportReviewSummary | null;
};

const ENTITIES: { key: EntityType; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "sessions", label: "Attendance" },
  { key: "payments", label: "Fees & payments" },
  { key: "teachers", label: "Teachers" },
];

function entityLabel(entityType: EntityType | null) {
  if (entityType === "sessions") return "Attendance";
  if (entityType === "payments") return "Fees & payments";
  if (entityType === "teachers") return "Teachers";
  return "Students";
}

// Derive entity status from the actual uploads in the bundle — the ImportSet.*Status
// columns are not reliably maintained, so a PROCESSED upload is the source of truth.
function deriveStatus(uploads: UploadHistoryRow[], entity: EntityType): EntityStatus {
  const relevant = uploads.filter((u) => (u.entityType ?? "students") === entity);
  if (relevant.some((u) => u.status === "PROCESSED")) return "imported";
  if (relevant.some((u) => ["MAPPED", "PREVIEW_READY", "PROCESSING"].includes(u.status))) return "mapped";
  return "missing";
}

function formatDate(value: string | null) {
  if (!value) return "Not processed";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function StatusPill({ status }: { status: EntityStatus }) {
  const map: Record<EntityStatus, { bg: string; fg: string; label: string }> = {
    missing:  { bg: "#F1F5F9", fg: "#64748B", label: "Not added" },
    mapped:   { bg: "#FEF3C7", fg: "#92400E", label: "Mapped" },
    imported: { bg: "#D1FAE5", fg: "#047857", label: "Added" },
    reviewed: { bg: "#D1FAE5", fg: "#047857", label: "Added · review" },
  };
  const m = map[status] ?? map.missing;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: m.bg, color: m.fg }}>{m.label}</span>
  );
}

export default async function ImportHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const academyId = dbUser.academy.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sets, error: setsError } = await (db as any)
    .from("ImportSet")
    .select("id, name, studentsStatus, teachersStatus, sessionsStatus, paymentsStatus, createdAt, updatedAt")
    .eq("academyId", academyId)
    .order("createdAt", { ascending: false }) as { data: ImportSetRow[] | null; error: { message: string } | null };
  if (setsError) throw new Error(`Failed to load import sets: ${setsError.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: uploads, error } = await (db as any)
    .from("Upload")
    .select("id, importSetId, fileName, entityType, status, processedAt, uploadedAt, rowCount, reviewJson")
    .eq("academyId", academyId)
    .order("uploadedAt", { ascending: false }) as { data: UploadHistoryRow[] | null; error: { message: string } | null };
  if (error) throw new Error(`Failed to load import history: ${error.message}`);

  const uploadsBySet = new Map<string, UploadHistoryRow[]>();
  const ungrouped: UploadHistoryRow[] = [];
  for (const upload of uploads ?? []) {
    if (upload.importSetId) {
      const list = uploadsBySet.get(upload.importSetId) ?? [];
      list.push(upload);
      uploadsBySet.set(upload.importSetId, list);
    } else {
      ungrouped.push(upload);
    }
  }

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Receipts · {dbUser.academy.name}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Import history</h1>
        <p style={{ fontSize: 14, color: "var(--neutral-500)", marginTop: 6 }}>
          Each bundle shows what data you&apos;ve added. Add attendance and fees to unlock risk scoring.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(sets ?? []).map((set) => {
          const setUploads = uploadsBySet.get(set.id) ?? [];
          return (
            <div key={set.id} style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
              {/* Bundle header */}
              <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--neutral-100)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--neutral-900)" }}>{set.name}</div>
                  <div style={{ fontSize: 12, color: "var(--neutral-500)", marginTop: 2 }}>Updated {formatDate(set.updatedAt)}</div>
                </div>
              </div>

              {/* Entity completeness grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: "16px 18px", borderBottom: setUploads.length ? "1px solid var(--neutral-100)" : "none" }}>
                {ENTITIES.map((entity) => {
                  const status = deriveStatus(setUploads, entity.key);
                  const needsAdding = status === "missing";
                  return (
                    <div key={entity.key} style={{ border: `1px solid ${needsAdding ? "#FDE68A" : "var(--neutral-200)"}`, background: needsAdding ? "#FFFBEB" : "#fff", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-800)" }}>{entity.label}</span>
                        <StatusPill status={status} />
                      </div>
                      {needsAdding ? (
                        <Link href={`/uploads/new?entity=${entity.key}`} style={{ fontSize: 12, fontWeight: 700, color: "#0F766E", textDecoration: "none" }}>
                          + Add {entity.label.toLowerCase()}
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--neutral-400)" }}>Done</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Receipts under the bundle */}
              {setUploads.length > 0 && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 0.9fr repeat(3, 0.6fr)", gap: 12, padding: "10px 18px", background: "var(--neutral-50)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 700 }}>
                    <div>File</div><div>Type</div><div>Processed</div><div>Rows</div><div>Updated</div><div>Issues</div>
                  </div>
                  {setUploads.map((upload) => {
                    const receipt = upload.reviewJson;
                    const issues = (receipt?.unmatchedRows ?? 0) + (receipt?.lowConfidenceRows ?? 0);
                    return (
                      <div key={upload.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 0.9fr repeat(3, 0.6fr)", gap: 12, padding: "12px 18px", borderTop: "1px solid var(--neutral-100)", alignItems: "center", fontSize: 13 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--neutral-900)" }}>{upload.fileName}</div>
                          <div style={{ color: "var(--neutral-500)", marginTop: 2, fontSize: 12 }}>{upload.status}</div>
                        </div>
                        <div style={{ color: "var(--neutral-700)" }}>{entityLabel(upload.entityType)}</div>
                        <div style={{ color: "var(--neutral-500)" }}>{formatDate(upload.processedAt ?? upload.uploadedAt)}</div>
                        <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-900)" }}>{(receipt?.readyRows ?? upload.rowCount ?? 0).toLocaleString()}</div>
                        <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-900)" }}>{(receipt?.updatedRows ?? 0).toLocaleString()}</div>
                        <div style={{ fontFamily: "var(--font-mono)", color: issues ? "#B45309" : "var(--neutral-400)" }}>{issues.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Legacy / unlinked uploads */}
        {ungrouped.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--neutral-100)", fontSize: 14, fontWeight: 700, color: "var(--neutral-700)" }}>Other imports</div>
            {ungrouped.map((upload) => (
              <div key={upload.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--neutral-100)", fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: "var(--neutral-900)" }}>{upload.fileName}<span style={{ color: "var(--neutral-500)", fontWeight: 400 }}> · {entityLabel(upload.entityType)}</span></div>
                <div style={{ color: "var(--neutral-500)" }}>{formatDate(upload.processedAt ?? upload.uploadedAt)}</div>
              </div>
            ))}
          </div>
        )}

        {(sets ?? []).length === 0 && ungrouped.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 36, textAlign: "center", color: "var(--neutral-500)", fontSize: 14 }}>
            No imports yet. <Link href="/uploads/new" style={{ color: "#0F766E", fontWeight: 600, textDecoration: "none" }}>Upload your first file</Link>
          </div>
        )}
      </div>
    </div>
  );
}

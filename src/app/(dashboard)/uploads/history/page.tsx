import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { db } from "@/lib/db/client";
import type { EntityType, ImportReviewSummary } from "@/lib/imports/types";

type UploadHistoryRow = {
  id: string;
  fileName: string;
  entityType: EntityType | null;
  status: string;
  processedAt: string | null;
  uploadedAt: string;
  rowCount: number | null;
  reviewJson: ImportReviewSummary | null;
};

function entityLabel(entityType: EntityType | null) {
  if (entityType === "sessions") return "Sessions";
  if (entityType === "payments") return "Payments";
  if (entityType === "teachers") return "Teachers";
  return "Students";
}

function formatDate(value: string | null) {
  if (!value) return "Not processed";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default async function ImportHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: uploads, error } = await (db as any)
    .from("Upload")
    .select("id, fileName, entityType, status, processedAt, uploadedAt, rowCount, reviewJson")
    .eq("academyId", dbUser.academy.id)
    .order("uploadedAt", { ascending: false }) as { data: UploadHistoryRow[] | null; error: { message: string } | null };

  if (error) throw new Error(`Failed to load import history: ${error.message}`);

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Receipts - {dbUser.academy.name}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Import history</h1>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.8fr repeat(4, 0.7fr)", gap: 12, padding: "12px 18px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 700 }}>
          <div>File</div><div>Entity</div><div>Processed</div><div>Imported</div><div>Updated</div><div>Unmatched</div><div>Low confidence</div>
        </div>
        {(uploads ?? []).map((upload) => {
          const receipt = upload.reviewJson;
          return (
            <div key={upload.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.8fr repeat(4, 0.7fr)", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--neutral-100)", alignItems: "center", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--neutral-900)" }}>{upload.fileName}</div>
                <div style={{ color: "var(--neutral-500)", marginTop: 2 }}>{upload.status}</div>
              </div>
              <div style={{ color: "var(--neutral-700)" }}>{entityLabel(upload.entityType)}</div>
              <div style={{ color: "var(--neutral-500)" }}>{formatDate(upload.processedAt ?? upload.uploadedAt)}</div>
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-900)" }}>{(receipt?.readyRows ?? upload.rowCount ?? 0).toLocaleString()}</div>
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-900)" }}>{(receipt?.updatedRows ?? 0).toLocaleString()}</div>
              <div style={{ fontFamily: "var(--font-mono)", color: receipt?.unmatchedRows ? "#B45309" : "var(--neutral-900)" }}>{(receipt?.unmatchedRows ?? 0).toLocaleString()}</div>
              <div style={{ fontFamily: "var(--font-mono)", color: receipt?.lowConfidenceRows ? "#B45309" : "var(--neutral-900)" }}>{(receipt?.lowConfidenceRows ?? 0).toLocaleString()}</div>
            </div>
          );
        })}
        {(uploads ?? []).length === 0 && (
          <div style={{ padding: 36, textAlign: "center", color: "var(--neutral-500)", fontSize: 14 }}>No imports yet.</div>
        )}
      </div>
    </div>
  );
}

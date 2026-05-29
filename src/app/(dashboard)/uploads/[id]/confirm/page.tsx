"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle, AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { UploadStepper } from "@/components/upload/UploadStepper";
import type { EntityType, ImportReviewSummary } from "@/lib/imports/types";

type Mode = "update" | "replace";
type PageState = "checking" | "choose" | "confirming_replace" | "processing" | "done" | "error";

export default function ConfirmPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const uploadId = params.id;

  const [state, setState] = useState<PageState>("checking");
  const [studentCount, setStudentCount] = useState(0);
  const [mode, setMode] = useState<Mode>("update");
  const [entityType, setEntityType] = useState<EntityType>("students");
  const [receipt, setReceipt] = useState<ImportReviewSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rowCount, setRowCount] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [academyRes, previewRes] = await Promise.all([
          fetch("/api/academy/has-data"),
          fetch(`/api/uploads/${uploadId}/normalize-preview`, { method: "POST" }),
        ]);
        const data = await academyRes.json();
        const preview = await previewRes.json();
        const nextEntityType = (preview.entityType ?? "students") as EntityType;
        setEntityType(nextEntityType);
        setReceipt(preview.review ?? null);
        setStudentCount(data.studentCount ?? 0);
        // If no existing data, skip choice and go straight to processing
        if (nextEntityType === "students" && (!data.hasStudents || data.studentCount === 0)) {
          await startProcessing("update");
        } else {
          setState("choose");
        }
      } catch {
        setState("error");
        setErrorMsg("Failed to check existing data");
      }
    })();

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startProcessing(selectedMode: Mode) {
    setState("processing");
    try {
      const res = await fetch(`/api/uploads/${uploadId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedMode }),
      });
      if (!res.ok && res.status !== 202) {
        const d = await res.json();
        setErrorMsg(d.error ?? "Failed to start processing");
        setState("error");
        return;
      }
      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/uploads/${uploadId}/status`);
          const statusData = await statusRes.json();
          if (statusData.status === "PROCESSED") {
            clearInterval(pollRef.current!);
            setRowCount(statusData.rowCount);
            setReceipt(statusData.review ?? null);
            setEntityType(statusData.entityType ?? entityType);
            setState("done");
          } else if (statusData.status === "FAILED") {
            clearInterval(pollRef.current!);
            setErrorMsg("Import failed. Please try again.");
            setState("error");
          }
        } catch {
          // keep polling on transient errors
        }
      }, 3000);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  function handleContinue() {
    if (mode === "replace" && entityType === "students") {
      setState("confirming_replace");
    } else {
      startProcessing(mode);
    }
  }

  return (
    <div className="page-fade">
      <UploadStepper currentStep={state === "done" ? "next" : "confirm"} />

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {state === "checking" && (
        <LoadingSpinner label="Checking your data…" />
      )}

      {state === "choose" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: 0 }}>
              {entityType === "students" ? "How should we handle existing student data?" : "Import mode"}
            </h1>
            <p style={{ fontSize: 14, color: "var(--neutral-500)", marginTop: 6 }}>
              {entityType === "students"
                ? `You already have ${studentCount.toLocaleString()} students. Choose how to merge this new upload.`
                : `Choose whether to add these ${entityType === "sessions" ? "session rows" : "payment rows"} or replace records from this import set.`}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            <ModeCard
              selected={mode === "update"}
              onClick={() => setMode("update")}
              icon={<RefreshCw size={18} color="#0F766E" />}
              title={entityType === "students" ? "Update existing students" : "Add these records"}
              desc={entityType === "students"
                ? "Match by name and contact. Update existing students, add new ones. Nothing is deleted."
                : `Add these ${entityType === "sessions" ? "sessions" : "payments"} and keep existing records.`}
              recommended
            />
            <ModeCard
              selected={mode === "replace"}
              onClick={() => setMode("replace")}
              icon={<Trash2 size={18} color="#DC2626" />}
              title={entityType === "students" ? "Delete all data and start fresh" : `Replace existing ${entityType} for this import set`}
              desc={entityType === "students"
                ? `Remove all ${studentCount.toLocaleString()} existing students and replace with this upload. This cannot be undone.`
                : `Replace only ${entityType} previously imported in this import set. Student records are not deleted.`}
              destructive={entityType === "students"}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => router.push(`/uploads/${uploadId}/normalize`)}
              style={{ fontSize: 14, fontWeight: 500, padding: "9px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-700)", cursor: "pointer" }}
            >
              Back
            </button>
            <button
              onClick={handleContinue}
              style={{ fontSize: 14, fontWeight: 500, padding: "9px 20px", borderRadius: "var(--radius-md)", border: "none", background: mode === "replace" ? "#DC2626" : "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <CheckCircle size={14} />
              Continue →
            </button>
          </div>
        </>
      )}

      {state === "confirming_replace" && (
        <div style={{ border: "1px solid #FECACA", borderRadius: 12, background: "#FEF2F2", padding: 24 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#991B1B", marginBottom: 6 }}>
                This will permanently delete {studentCount.toLocaleString()} students
              </div>
              <div style={{ fontSize: 13, color: "#7F1D1D", lineHeight: 1.6 }}>
                All student records, risk assessments, and intervention history for your academy will be deleted. This cannot be undone.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => setState("choose")}
              style={{ fontSize: 14, fontWeight: 500, padding: "9px 16px", borderRadius: "var(--radius-md)", border: "1px solid #FECACA", background: "#fff", color: "#991B1B", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => startProcessing("replace")}
              style={{ fontSize: 14, fontWeight: 500, padding: "9px 20px", borderRadius: "var(--radius-md)", border: "none", background: "#DC2626", color: "#fff", cursor: "pointer" }}
            >
              Yes, delete all and start fresh
            </button>
          </div>
        </div>
      )}

      {state === "processing" && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ width: 40, height: 40, border: "4px solid var(--primary-500)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--neutral-800)", marginBottom: 8 }}>Importing structured data...</div>
          <div style={{ fontSize: 13, color: "var(--neutral-500)" }}>
            {entityType === "students"
              ? "Importing students without fake churn scores. Sessions and payments unlock stronger risk signals."
              : entityType === "sessions"
                ? "Importing session rows and updating attendance summaries."
                : "Importing payment rows and updating payment summaries."}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state === "done" && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <CheckCircle size={24} color="#10B981" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 8 }}>
            {entityType === "students" ? "Students" : entityType === "sessions" ? "Sessions" : "Payments"} import complete
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, margin: "0 auto 24px", maxWidth: 560 }}>
            <ReceiptMetric label={entityType === "students" ? "Imported" : "Rows imported"} value={receipt?.readyRows ?? rowCount ?? 0} />
            <ReceiptMetric label={entityType === "students" ? "Updated" : "Matched students"} value={entityType === "students" ? receipt?.updatedRows ?? 0 : receipt?.readyRows ?? 0} />
            <ReceiptMetric label="Unmatched" value={receipt?.unmatchedRows ?? 0} />
            <ReceiptMetric label="Low confidence" value={receipt?.lowConfidenceRows ?? 0} />
          </div>
          {(entityType === "sessions" || entityType === "payments") && (
            <div style={{ maxWidth: 560, margin: "0 auto 24px", padding: "12px 14px", borderRadius: 8, border: "1px solid #FDE68A", background: "#FFFBEB", display: "flex", gap: 10, textAlign: "left", alignItems: "flex-start" }}>
              <AlertTriangle size={16} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "#78350F" }}>
                <strong>Risk scores need an update.</strong> This import changed {entityType === "sessions" ? "attendance" : "payment"} data. Go to the dashboard next and run scoring so student risk labels use the latest records.
              </div>
            </div>
          )}
          {entityType === "students" && (
            <div style={{ maxWidth: 560, margin: "0 auto 24px", padding: "12px 14px", borderRadius: 8, border: "1px solid #CCFBF1", background: "#F0FDFA", textAlign: "left" }}>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "#115E59" }}>
                <strong>Next: add sessions and payments.</strong> Risk scoring appears after Rakho has attendance or payment records to evaluate.
              </div>
            </div>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            style={{ fontSize: 14, fontWeight: 500, padding: "10px 24px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer" }}
          >
            Go to dashboard →
          </button>
        </div>
      )}

      {state === "error" && (
        <div style={{ padding: "16px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13 }}>
          {errorMsg}
        </div>
      )}
      </div>
    </div>
  );
}

function ModeCard({
  selected, onClick, icon, title, desc, recommended, destructive,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  recommended?: boolean;
  destructive?: boolean;
}) {
  const borderColor = selected
    ? destructive ? "#DC2626" : "#0F766E"
    : "var(--neutral-200)";
  const bg = selected
    ? destructive ? "#FEF2F2" : "#F0FDFA"
    : "#fff";

  return (
    <button
      onClick={onClick}
      style={{ textAlign: "left", padding: "16px", borderRadius: 10, border: `2px solid ${borderColor}`, background: bg, cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start", transition: "border-color 0.15s" }}
    >
      <div style={{ marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>{title}</span>
          {recommended && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#0F766E", background: "#D1FAE5", padding: "1px 7px", borderRadius: 99 }}>Recommended</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--neutral-500)", lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? borderColor : "var(--neutral-300)"}`, background: selected ? borderColor : "transparent", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
      </div>
    </button>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "40px 0", color: "var(--neutral-500)", fontSize: 14 }}>
      <div style={{ width: 24, height: 24, border: "3px solid var(--primary-500)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ReceiptMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--neutral-200)", background: "#fff", textAlign: "left" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--neutral-900)" }}>{value.toLocaleString()}</div>
      <div style={{ marginTop: 3, fontSize: 11, color: "var(--neutral-500)", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertCircle, CheckCircle, X, HelpCircle, Loader2, Users, GraduationCap, CalendarCheck, CreditCard, ChevronDown, Check, Layers } from "lucide-react";
import { UploadStepper } from "@/components/upload/UploadStepper";
import { LoadDemoDataButton } from "@/components/dashboard/LoadDemoDataButton";
import type { EntityType } from "@/lib/imports/types";

const REQUIRED_COLS = [
  { name: "Student Name", example: "Ali Hassan", note: "Required. Used to identify each student." },
];

const RECOMMENDED_COLS = [
  { name: "Last Session Date", example: "2024-04-20", note: "Days since last session drives the risk score." },
  { name: "Attendance Rate", example: "72", note: "Percentage 0–100. Low attendance = high risk." },
  { name: "Payment Status", example: "Overdue 14d", note: "Any text with 'overdue' or 'unpaid' flags risk." },
  { name: "Fees Amount", example: "12000", note: "Monthly fee amount. Used for revenue-at-risk calculation." },
];

const OPTIONAL_COLS = [
  { name: "Join Date", example: "2023-09-01", note: "Used to show how long a student has been enrolled." },
  { name: "Subject / Class", example: "Grade 9 · Math", note: "Groups students by class on the dashboard." },
  { name: "Tutor Assigned", example: "Ms. Rehana", note: "Links students to tutor risk overview." },
  { name: "Contact / Phone", example: "+92 300 1234567", note: "Shown on student profile for quick outreach." },
  { name: "Student ID", example: "SR-1042", note: "Your own ID. Shown in tables instead of system ID." },
  { name: "Notes", example: "Parent prefers WhatsApp", note: "Free-text notes shown on student detail page." },
];

const STUDENT_IDENTIFIER_ROWS = [
  { name: "Student ID / Roll No / Reg No", example: "ST-1042", note: "Best choice. Must stay the same across all files." },
  { name: "Email", example: "ali@example.com", note: "Good if every student has their own unique email." },
  { name: "Phone", example: "+92 300 1234567", note: "Useful, but siblings may share one parent phone." },
  { name: "Student Name", example: "Ali Hassan", note: "Allowed, but low confidence. You will review matches." },
];

const GUIDE_SECTIONS = [
  {
    label: "Students",
    color: "#0F766E",
    bg: "#F0FDFA",
    rows: [
      { name: "student_id", example: "ST-1042", note: "Recommended stable identifier." },
      { name: "student_name", example: "Ali Hassan", note: "Required for roster display." },
      { name: "phone / email", example: "+92 300 1234567", note: "Contact and fallback matching." },
      { name: "subject / teacher_name", example: "Grade 9 Math / Ms Sara", note: "Useful for filtering and teacher pages." },
      { name: "monthly_fee", example: "12000", note: "Fallback revenue context until payments are uploaded." },
    ],
  },
  {
    label: "Teachers",
    color: "#0369A1",
    bg: "#E0F2FE",
    rows: [
      { name: "teacher_name", example: "Ms Sara", note: "Required. Creates or updates teacher records." },
      { name: "phone / email", example: "sara@example.com", note: "Optional teacher contact details." },
      { name: "subject", example: "Physics", note: "Optional teaching area." },
    ],
  },
  {
    label: "Sessions",
    color: "#7C3AED",
    bg: "#EDE9FE",
    rows: [
      { name: "student_id", example: "ST-1042", note: "Strongly recommended to link attendance." },
      { name: "session_date", example: "2026-05-01", note: "For long-format attendance files." },
      { name: "attendance_status", example: "Present", note: "Present, absent, late, attended, or missed." },
      { name: "date columns", example: "2026-05-01", note: "Wide format is supported when date columns hold attendance values." },
      { name: "attendance summary", example: "18/22 or 82%", note: "Aggregate format is accepted as summary data." },
    ],
  },
  {
    label: "Payments",
    color: "#B45309",
    bg: "#FEF3C7",
    rows: [
      { name: "student_id", example: "ST-1042", note: "Strongly recommended to link payments." },
      { name: "payment_date", example: "2026-05-03", note: "For transaction-format files." },
      { name: "amount", example: "12000", note: "Payment amount, currency symbols are okay." },
      { name: "payment_status", example: "Paid / Overdue", note: "Used for fee-risk signals." },
      { name: "month columns", example: "Jan 2026", note: "Monthly wide format is supported." },
    ],
  },
];

function ColumnGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          width: "100%", maxWidth: 640, maxHeight: "88vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--neutral-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--neutral-900)" }}>How to prepare your file</div>
            <div style={{ fontSize: 13, color: "var(--neutral-500)", marginTop: 2 }}>Column names don&apos;t have to match exactly — we&apos;ll map them automatically.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--neutral-400)", padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 24px 24px" }}>

          {/* Required */}
          <SectionLabel label="Required" color="#DC2626" bg="#FEF2F2" />
          <ColTable rows={REQUIRED_COLS} />

          {/* Recommended */}
          <SectionLabel label="Highly recommended" color="#D97706" bg="#FFFBEB" style={{ marginTop: 20 }} />
          <div style={{ fontSize: 13, color: "var(--neutral-500)", marginBottom: 8 }}>
            These columns power the risk score. More = better predictions.
          </div>
          <ColTable rows={RECOMMENDED_COLS} />

          {/* Optional */}
          <SectionLabel label="Optional but useful" color="#0F766E" bg="#F0FDFA" style={{ marginTop: 20 }} />
          <ColTable rows={OPTIONAL_COLS} />

          {/* Ideal sheet tip */}
          <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--neutral-50)", border: "1px solid var(--neutral-200)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-800)", marginBottom: 6 }}>
              Ideal sheet layout
            </div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)", lineHeight: 1.6 }}>
              • Row 1 = column headers (any order, any language)<br />
              • One student per row<br />
              • Dates as <code style={{ background: "var(--neutral-100)", padding: "1px 4px", borderRadius: 3 }}>YYYY-MM-DD</code> or <code style={{ background: "var(--neutral-100)", padding: "1px 4px", borderRadius: 3 }}>DD/MM/YYYY</code><br />
              • Attendance as a number (e.g. <code style={{ background: "var(--neutral-100)", padding: "1px 4px", borderRadius: 3 }}>72</code> not <code style={{ background: "var(--neutral-100)", padding: "1px 4px", borderRadius: 3 }}>72%</code>)<br />
              • No merged cells, no summary rows at the bottom<br />
              • One sheet only (first sheet is used if multiple exist)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label, color, bg, style }: { label: string; color: string; bg: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8, ...style }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color, background: bg, padding: "2px 8px", borderRadius: 99 }}>{label}</span>
    </div>
  );
}

function ColTable({ rows }: { rows: { name: string; example: string; note: string }[] }) {
  return (
    <div style={{ border: "1px solid var(--neutral-200)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr", background: "var(--neutral-50)", padding: "8px 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", borderBottom: "1px solid var(--neutral-100)" }}>
        <div>Column name</div><div>Example value</div><div>Why it matters</div>
      </div>
      {rows.map((r, i) => (
        <div key={r.name} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr", padding: "9px 12px", fontSize: 13, borderBottom: i < rows.length - 1 ? "1px solid var(--neutral-100)" : "none", alignItems: "start" }}>
          <div style={{ fontWeight: 600, color: "var(--neutral-900)" }}>{r.name}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--neutral-600)" }}>{r.example}</div>
          <div style={{ color: "var(--neutral-500)", fontSize: 12 }}>{r.note}</div>
        </div>
      ))}
    </div>
  );
}

function StructuredColumnGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          width: "100%", maxWidth: 720, maxHeight: "88vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--neutral-100)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--neutral-900)" }}>How to prepare your file</div>
            <div style={{ fontSize: 13, color: "var(--neutral-500)", marginTop: 2 }}>
              Choose the file type first. Rakho AI detects the format, then asks you to confirm identifiers and mapping.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--neutral-400)", padding: 4, display: "flex", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "20px 24px 24px" }}>
          <SectionLabel label="Student Identifier" color="#DC2626" bg="#FEF2F2" />
          <div style={{ fontSize: 13, color: "var(--neutral-500)", marginBottom: 8 }}>
            Use the same stable identifier across students, sessions, and payments. Row number is not a valid identifier.
          </div>
          <ColTable rows={STUDENT_IDENTIFIER_ROWS} />

          {GUIDE_SECTIONS.map((section, index) => (
            <div key={section.label}>
              <SectionLabel label={section.label} color={section.color} bg={section.bg} style={{ marginTop: index === 0 ? 20 : 22 }} />
              <ColTable rows={section.rows} />
            </div>
          ))}

          <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--neutral-50)", border: "1px solid var(--neutral-200)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-800)", marginBottom: 6 }}>
              Supported and unsupported formats
            </div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)", lineHeight: 1.6 }}>
              - Row 1 should contain column headers. Any order is okay.<br />
              - Sessions can be long format, wide date columns, or aggregate attendance summaries.<br />
              - Payments can be transactions, monthly wide columns, or aggregate payment summaries.<br />
              - Avoid merged-cell calendars, color-only tracking, and rows that combine multiple students.<br />
              - If Rakho AI cannot safely link rows, it shows a review screen instead of guessing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

interface PreviewData {
  uploadId: string;
  importSetId: string;
  entityType: EntityType;
  formatType: string;
  fileName: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  warnings: string[];
}

const ENTITY_OPTIONS: {
  value: EntityType;
  label: string;
  desc: string;
  icon: typeof Users;
}[] = [
  { value: "students", label: "Students", desc: "Start here. Import roster, identifiers, subjects, fees, and teacher names.", icon: Users },
  { value: "teachers", label: "Teachers", desc: "Optional context for tutor analytics and cleaner linking.", icon: GraduationCap },
  { value: "sessions", label: "Sessions", desc: "Attendance and recency history. Requires students first.", icon: CalendarCheck },
  { value: "payments", label: "Payments", desc: "Fee transactions and overdue signals. Requires students first.", icon: CreditCard },
];

type State = "checking" | "idle" | "uploading" | "sheet_select" | "preview" | "error" | "blocked_job";

export default function UploadNewPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showGuide, setShowGuide] = useState(false);
  const [activeJobFile, setActiveJobFile] = useState<string>("");
  const [navigating, setNavigating] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("students");
  const [academyEmpty, setAcademyEmpty] = useState(false);
  const [sheetSelect, setSheetSelect] = useState<{ file: File; sheets: string[] } | null>(null);
  const [chosenSheet, setChosenSheet] = useState<string>("");
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);

  // Offer demo data only while the academy has no students at all.
  useEffect(() => {
    fetch("/api/academy/has-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAcademyEmpty(data ? !data.hasStudents : false))
      .catch(() => setAcademyEmpty(false));
  }, []);

  // Preselect the entity when arriving from an "Add attendance/fees" link.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("entity");
    if (param && ["students", "teachers", "sessions", "payments"].includes(param)) {
      setEntityType(param as EntityType);
    }
  }, []);

  useEffect(() => {
    fetch("/api/uploads/active")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasActiveJob) {
          setActiveJobFile(data.upload?.fileName ?? "your file");
          setState("blocked_job");
        } else {
          setState("idle");
        }
      })
      .catch(() => setState("idle"));
  }, []);

  const uploadFile = useCallback(async (file: File, sheet?: string) => {
    setState("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    if (sheet) formData.append("sheet", sheet);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.activeUploadId) {
          setActiveJobFile(data.upload?.fileName ?? "your file");
          setState("blocked_job");
        } else {
          setErrorMsg(data.error ?? "Upload failed");
          setState("error");
        }
        return;
      }

      // Workbook has multiple sheets — let the user pick one, then re-post.
      if (data.needsSheetSelection) {
        setSheetSelect({ file, sheets: data.sheets as string[] });
        setChosenSheet((data.sheets as string[])[0] ?? "");
        setSheetDropdownOpen(false);
        setState("sheet_select");
        return;
      }

      setPreview(data);
      setState("preview");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }, [entityType]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await uploadFile(file);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        "application/vnd.ms-excel": [".xls"],
      },
      maxSize: MAX_UPLOAD_BYTES,
      multiple: false,
      disabled: state === "uploading",
    });

  const rejectionMsg =
    fileRejections[0]?.errors[0]?.code === "file-too-large"
      ? `File exceeds ${MAX_UPLOAD_MB} MB limit.`
      : fileRejections[0]?.errors[0]?.code === "file-invalid-type"
      ? "Only .csv, .xlsx, and .xls files allowed."
      : "";

  return (
    <div className="page-fade" style={{ margin: "0 auto" }}>
      {showGuide && <StructuredColumnGuideModal onClose={() => setShowGuide(false)} />}

      <UploadStepper currentStep={state === "preview" ? "detect" : state === "uploading" ? "file" : "upload"} />

      {state === "checking" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--neutral-500)", fontSize: 14, padding: "40px 0" }}>
          <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} />
          Checking…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state === "blocked_job" && (
        <div style={{ padding: "20px 24px", borderRadius: 12, background: "#FFFBEB", border: "1px solid #FDE68A", display: "flex", gap: 14 }}>
          <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#92400E", marginBottom: 4 }}>Scoring in progress</div>
            <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.6 }}>
              <strong>{activeJobFile}</strong> is currently being scored. Wait for it to finish before uploading new data.
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ marginTop: 12, fontSize: 13, fontWeight: 500, padding: "7px 14px", borderRadius: "var(--radius-md)", border: "1px solid #FDE68A", background: "#fff", color: "#92400E", cursor: "pointer" }}
            >
              Go to dashboard
            </button>
          </div>
        </div>
      )}

      {state !== "blocked_job" && state !== "checking" && <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 500,
              color: "var(--neutral-900)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Structured import
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-500)", marginTop: 6 }}>
            Start with students, then add sessions and payments when you have them.
          </p>
          <div style={{ marginTop: 10, display: "inline-block", padding: "8px 12px", borderRadius: 8, background: "#FEF3C7", color: "#92400E", fontSize: 12.5, fontWeight: 600 }}>
            Beta: uploads and the number of students are limited per account. Extra rows above the cap are skipped.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4 }}>
          {academyEmpty && <LoadDemoDataButton mode="load" redirectTo="/dashboard" size="sm" />}
          <button
            onClick={() => setShowGuide(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 500, color: "var(--primary-600, #0F766E)",
              background: "var(--primary-50, #f0fdfa)", border: "1px solid var(--primary-100, #ccfbf1)",
              borderRadius: "var(--radius-md)", padding: "7px 12px", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <HelpCircle size={14} />
            How to prepare your file
          </button>
        </div>
      </div>}

      {state !== "blocked_job" && state !== "checking" && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 20 }}>
        {ENTITY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = entityType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setEntityType(option.value)}
              style={{
                position: "relative",
                textAlign: "left",
                padding: 14,
                borderRadius: 8,
                border: `1px solid ${selected ? "#0F766E" : "var(--neutral-200)"}`,
                background: selected ? "#F0FDFA" : "#fff",
                color: "var(--neutral-800)",
                cursor: "pointer",
                minHeight: 118,
              }}
            >
              {selected && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#0F766E",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={13} />
                </span>
              )}
              <Icon size={17} color={selected ? "#0F766E" : "var(--neutral-500)"} />
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>{option.label}</div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "var(--neutral-500)" }}>{option.desc}</div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--neutral-200)", background: "#fff" }}>
        <div style={{ fontSize: 12, color: "var(--neutral-600)" }}>
          Recommended: keep a stable <strong>Student ID / Roll No / Reg No</strong> across every file. Row number is not valid.
        </div>
        <a
          href={`/api/import-templates/${entityType}`}
          style={{ fontSize: 12, fontWeight: 600, color: "#0F766E", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Download {entityType} template
        </a>
      </div>
      {/* Drop zone */}
      {(state === "idle" || state === "error") && (
        <>
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? "var(--primary-500)" : "var(--neutral-200)"}`,
              borderRadius: "var(--radius-lg, 12px)",
              background: isDragActive ? "var(--primary-50, #f0fdfa)" : "#fff",
              padding: "64px 32px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <input {...getInputProps()} />
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: "var(--primary-50, #f0fdfa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Upload size={24} color="var(--primary-500)" />
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--neutral-800)",
                margin: "0 0 6px",
              }}
            >
              {isDragActive ? "Drop it here" : "Drag & drop your file here"}
            </p>
            <p style={{ fontSize: 13, color: "var(--neutral-500)", margin: 0 }}>
              or{" "}
              <span style={{ color: "var(--primary-500)", fontWeight: 500 }}>
                browse files
              </span>{" "}
              · CSV, Excel (.xlsx, .xls) · Max {MAX_UPLOAD_MB} MB
            </p>
          </div>

          {(rejectionMsg || errorMsg) && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#DC2626",
              }}
            >
              <AlertCircle size={14} />
              {rejectionMsg || errorMsg}
            </div>
          )}
        </>
      )}

      {/* Uploading */}
      {state === "uploading" && (
        <div
          style={{
            border: "2px dashed var(--neutral-200)",
            borderRadius: "var(--radius-lg, 12px)",
            background: "#fff",
            padding: "64px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid var(--primary-500)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: 0 }}>
            Parsing your file…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Sheet selection — workbook has more than one sheet */}
      {state === "sheet_select" && sheetSelect && (
        <div
          style={{
            border: "1px solid var(--neutral-200)",
            borderRadius: "var(--radius-lg, 12px)",
            background: "#fff",
            padding: "32px",
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--primary-50, #F0FDFA)", border: "1px solid var(--primary-100, #CCFBF1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Layers size={20} color="#0F766E" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sheetSelect.file.name}
              </div>
              <p style={{ fontSize: 13, color: "var(--neutral-500)", margin: "3px 0 0", lineHeight: 1.5 }}>
                This workbook has {sheetSelect.sheets.length} sheets. Pick the one to import — you can upload the others separately afterwards.
              </p>
            </div>
          </div>

          {/* Sheet dropdown */}
          <div style={{ position: "relative", marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-600)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
              Sheet to import
            </div>
            <button
              type="button"
              onClick={() => setSheetDropdownOpen((open) => !open)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 14,
                fontWeight: 500,
                padding: "11px 14px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${sheetDropdownOpen ? "#0F766E" : "var(--neutral-200)"}`,
                boxShadow: sheetDropdownOpen ? "0 0 0 3px rgba(15,118,110,0.12)" : "none",
                background: "#fff",
                color: "var(--neutral-900)",
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <FileText size={15} color="#0F766E" style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chosenSheet}</span>
              </span>
              <ChevronDown
                size={16}
                color="var(--neutral-400)"
                style={{ flexShrink: 0, transform: sheetDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
            </button>

            {sheetDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: "#fff",
                  border: "1px solid var(--neutral-200)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                  overflow: "hidden",
                  maxHeight: 240,
                  overflowY: "auto",
                }}
              >
                {sheetSelect.sheets.map((name) => {
                  const selected = name === chosenSheet;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setChosenSheet(name); setSheetDropdownOpen(false); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 13.5,
                        fontWeight: selected ? 600 : 500,
                        padding: "10px 14px",
                        border: "none",
                        background: selected ? "var(--primary-50, #F0FDFA)" : "#fff",
                        color: selected ? "#0F766E" : "var(--neutral-800)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "var(--neutral-50, #FAFAF9)"; }}
                      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "#fff"; }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                        <FileText size={14} color={selected ? "#0F766E" : "var(--neutral-400)"} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      </span>
                      {selected && <Check size={15} color="#0F766E" style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => uploadFile(sheetSelect.file, chosenSheet)}
              disabled={!chosenSheet}
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 600,
                padding: "11px 18px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--primary-500)",
                color: "#fff",
                cursor: chosenSheet ? "pointer" : "not-allowed",
                opacity: chosenSheet ? 1 : 0.6,
              }}
            >
              Import this sheet →
            </button>
            <button
              type="button"
              onClick={() => { setSheetSelect(null); setSheetDropdownOpen(false); setState("idle"); }}
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                padding: "11px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--neutral-200)",
                background: "#fff",
                color: "var(--neutral-600)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <X size={13} />
              Different file
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {state === "preview" && preview && (
        <div>
          {/* File info bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--neutral-200)",
              background: "#fff",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileText size={16} color="var(--primary-500)" />
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--neutral-800)" }}>
                {preview.fileName}
              </span>
              <span style={{ fontSize: 13, color: "var(--neutral-500)" }}>
                · {preview.totalRows.toLocaleString()} rows detected · {preview.entityType} · {preview.formatType}
              </span>
            </div>
            <button
              onClick={() => { setState("idle"); setPreview(null); }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--neutral-400)",
                padding: 4,
                display: "flex",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: 13,
                color: "#92400E",
              }}
            >
              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                {preview.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          <div
            style={{
              border: "1px solid var(--neutral-200)",
              borderRadius: "var(--radius-lg, 12px)",
              overflow: "hidden",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--neutral-200)",
                background: "var(--neutral-50, #fafafa)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--neutral-500)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Preview — first {preview.sampleRows.length} rows
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--neutral-50, #fafafa)" }}>
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontWeight: 600,
                          color: "var(--neutral-700)",
                          borderBottom: "1px solid var(--neutral-200)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleRows.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom:
                          i < preview.sampleRows.length - 1
                            ? "1px solid var(--neutral-100)"
                            : "none",
                      }}
                    >
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          style={{
                            padding: "10px 14px",
                            color: "var(--neutral-700)",
                            whiteSpace: "nowrap",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {row[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setState("idle"); setPreview(null); }}
              style={{
                fontSize: 14,
                fontWeight: 500,
                padding: "9px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--neutral-200)",
                background: "#fff",
                color: "var(--neutral-700)",
                cursor: "pointer",
              }}
            >
              Upload different file
            </button>
            <button
              onClick={() => { setNavigating(true); router.push(`/uploads/${preview.uploadId}/map`); }}
              disabled={navigating}
              style={{
                fontSize: 14,
                fontWeight: 500,
                padding: "9px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: navigating ? "var(--neutral-300)" : "var(--primary-500)",
                color: "#fff",
                cursor: navigating ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: navigating ? 0.7 : 1,
              }}
            >
              {navigating ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : <CheckCircle size={14} />}
              {navigating ? "Loading…" : "Detect format & map →"}
            </button>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

interface PreviewData {
  uploadId: string;
  fileName: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  warnings: string[];
}

type State = "idle" | "uploading" | "preview" | "error";

export default function UploadNewPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setState("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Upload failed");
        setState("error");
        return;
      }

      setPreview(data);
      setState("preview");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }, []);

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
    <div className="page-fade" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
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
          Upload student data
        </h1>
        <p style={{ fontSize: 14, color: "var(--neutral-500)", marginTop: 6 }}>
          Upload a CSV or Excel file. Any column names — we&apos;ll map them for you.
        </p>
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
                · {preview.totalRows.toLocaleString()} rows detected
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
              onClick={() => router.push(`/uploads/${preview.uploadId}/map`)}
              style={{
                fontSize: 14,
                fontWeight: 500,
                padding: "9px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--primary-500)",
                color: "#fff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle size={14} />
              Map columns →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

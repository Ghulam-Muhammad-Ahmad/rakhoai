"use client";

import { useState } from "react";
import { X, Database, Loader2 } from "lucide-react";

type RawField = { key: string; value: string };

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function StudentDataModal({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<RawField[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openAndLoad() {
    setOpen(true);
    if (fields || loading) return; // already loaded / loading
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/raw`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not load data");
      setFields(data.fields ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openAndLoad}
        style={{
          fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--primary-600)",
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        <Database size={13} /> Raw data
      </button>

      {open && (
        <div
          role="dialog" aria-modal="true" aria-label={`Unmapped raw data for ${studentName}`}
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(720px, 100%)", maxHeight: "86vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--neutral-200)", boxShadow: "0 24px 80px rgba(15,23,42,0.22)", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--neutral-100)" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--neutral-900)" }}>{studentName}</div>
                <div style={{ fontSize: 13, color: "var(--neutral-500)", marginTop: 2 }}>Unmapped raw data — columns kept from the upload but not mapped to a field</div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-500)", cursor: "pointer", flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 22, overflowY: "auto" }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--neutral-500)", fontSize: 14 }}>
                  <Loader2 size={16} style={{ animation: "spin 0.9s linear infinite" }} /> Loading…
                </div>
              ) : error ? (
                <div style={{ padding: "32px 8px", textAlign: "center", fontSize: 14, color: "var(--error)" }}>{error}</div>
              ) : fields && fields.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {fields.map((f) => (
                    <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "10px 12px", border: "1px solid var(--neutral-100)", borderRadius: "var(--radius-md)", background: "var(--neutral-50)" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-400)" }}>{humanizeKey(f.key)}</span>
                      <span style={{ fontSize: 14, color: "var(--neutral-800)", fontWeight: 500, overflowWrap: "anywhere" }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "32px 8px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
                  No unmapped columns — every field from this student&apos;s upload was mapped.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

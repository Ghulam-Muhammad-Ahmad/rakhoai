"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Trash2 } from "lucide-react";

export function LoadDemoDataButton({ mode = "load", redirectTo, size = "md" }: { mode?: "load" | "remove"; redirectTo?: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/seed", { method: mode === "load" ? "POST" : "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Failed to ${mode} demo data`);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLoad = mode === "load";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          fontSize: size === "sm" ? 13 : isLoad ? 14 : 13,
          fontWeight: 500,
          padding: size === "sm" ? "7px 12px" : isLoad ? "9px 14px" : "8px 12px",
          borderRadius: "var(--radius-md)",
          border: isLoad ? "1px dashed var(--primary-300, #5EEAD4)" : "1px solid var(--neutral-200)",
          background: isLoad ? "var(--primary-50, #F0FDFA)" : "#fff",
          color: isLoad ? "#0F766E" : "var(--neutral-500)",
          cursor: loading ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isLoad ? (
          <Sparkles size={14} />
        ) : (
          <Trash2 size={13} />
        )}
        {loading
          ? isLoad ? "Setting up demo academy…" : "Removing demo data…"
          : isLoad ? "Try with demo data" : "Remove demo data"}
      </button>
      {error && <div style={{ fontSize: 12, color: "var(--error, #DC2626)" }}>{error}</div>}
    </div>
  );
}

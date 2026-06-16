"use client";

import { CheckIcon } from "lucide-react";

const STEPS = [
  // each step accepts the legacy keys pages already pass
  { label: "Upload", keys: ["upload", "file", "detect", "identifier"] },
  { label: "Map columns", keys: ["map"] },
  { label: "Review rows", keys: ["normalize"] },
  { label: "Import", keys: ["confirm", "next"] },
] as const;

type UploadStep = (typeof STEPS)[number]["keys"][number];

export function UploadStepper({ currentStep }: { currentStep: UploadStep }) {
  const currentIndex = STEPS.findIndex((s) => (s.keys as readonly string[]).includes(currentStep));
  // "next" is the receipt state — show the final step as completed
  const lastDone = currentStep === "next";

  return (
    <div
      style={{
        marginBottom: 28,
        overflowX: "auto",
        padding: "16px 18px",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 480 }}>
        {STEPS.map((step, i) => {
          const done = i < currentIndex || (lastDone && i === currentIndex);
          const active = i === currentIndex && !done;

          return (
            <div
              key={step.label}
              style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    background: done || active ? "#0F766E" : "var(--neutral-100)",
                    color: done || active ? "#fff" : "var(--neutral-500)",
                    boxShadow: active ? "0 0 0 4px rgba(15,118,110,0.14)" : "none",
                    transition: "background 0.15s, box-shadow 0.15s",
                  }}
                >
                  {done ? <CheckIcon size={15} color="#fff" /> : i + 1}
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--neutral-900)" : done ? "#0F766E" : "var(--neutral-400)",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    borderRadius: 2,
                    background: done ? "#0F766E" : "var(--neutral-200)",
                    margin: "0 10px",
                    transition: "background 0.15s",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

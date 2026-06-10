"use client";

import { CheckIcon } from "lucide-react";

const STEPS = [
  { label: "Choose data type", key: "upload" },
  { label: "Upload file", key: "file" },
  { label: "Format detected", key: "detect" },
  { label: "Choose identifier", key: "identifier" },
  { label: "Map columns", key: "map" },
  { label: "Review rows", key: "normalize" },
  { label: "Import", key: "confirm" },
  { label: "Receipt", key: "next" },
] as const;

type UploadStep = (typeof STEPS)[number]["key"];

export function UploadStepper({ currentStep }: { currentStep: UploadStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div
      style={{
        marginBottom: 28,
        overflowX: "auto",
        padding: "12px 16px",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          return (
            <div
              key={step.key}
              style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}
            >
              <div
                title={step.label}
                style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
              >
                <div
                  style={{
                    width: active ? 24 : 20,
                    height: active ? 24 : 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    background: done || active ? "#0F766E" : "var(--neutral-100)",
                    color: done || active ? "#fff" : "var(--neutral-500)",
                    boxShadow: active ? "0 0 0 4px rgba(15,118,110,0.14)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {done ? <CheckIcon size={12} color="#fff" /> : i + 1}
                </div>
                {active && (
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--neutral-900)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.label}
                  </span>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    borderRadius: 2,
                    background: done ? "#0F766E" : "var(--neutral-200)",
                    margin: "0 8px",
                    minWidth: 12,
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

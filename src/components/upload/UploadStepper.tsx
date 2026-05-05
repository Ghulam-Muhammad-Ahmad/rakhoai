"use client";

const STEPS = [
  { label: "Choose data type", key: "upload" },
  { label: "Upload file", key: "file" },
  { label: "Format detected", key: "detect" },
  { label: "Choose identifier", key: "identifier" },
  { label: "Map columns", key: "map" },
  { label: "Review rows", key: "normalize" },
  { label: "Import", key: "confirm" },
  { label: "Receipt / next action", key: "next" },
];

export function UploadStepper({ currentStep }: { currentStep: "upload" | "file" | "detect" | "identifier" | "map" | "normalize" | "confirm" | "next" }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: done ? "#0F766E" : active ? "#0F766E" : "var(--neutral-200)",
                color: done || active ? "#fff" : "var(--neutral-500)",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "var(--neutral-900)" : done ? "#0F766E" : "var(--neutral-400)",
                whiteSpace: "nowrap",
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "#0F766E" : "var(--neutral-200)", margin: "0 12px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

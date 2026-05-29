import type { AvatarTone } from "@/lib/db/types";

const tones: Record<AvatarTone, { bg: string; fg: string }> = {
  primary: { bg: "var(--primary-100)", fg: "var(--primary-700)" },
  accent:  { bg: "var(--accent-100)",  fg: "var(--accent-700)"  },
  blue:    { bg: "#DBEAFE",            fg: "#1D4ED8"            },
  rose:    { bg: "#FFE4E6",            fg: "#9F1239"            },
  slate:   { bg: "var(--neutral-200)", fg: "var(--neutral-700)" },
};

const sizes = {
  sm: { width: 28, height: 28, fontSize: 11 },
  md: { width: 36, height: 36, fontSize: 13 },
  lg: { width: 56, height: 56, fontSize: 18 },
};

export default function Avatar({
  initials,
  tone = "primary",
  size = "md",
}: {
  initials: string;
  tone?: AvatarTone;
  size?: "sm" | "md" | "lg";
}) {
  const t = tones[tone];
  const s = sizes[size];
  return (
    <div
      style={{
        width: s.width, height: s.height, borderRadius: "var(--radius-full)",
        background: t.bg, color: t.fg, display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 600, fontSize: s.fontSize, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

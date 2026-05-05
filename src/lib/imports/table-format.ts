export type StatusTone = "success" | "warning" | "danger" | "neutral";

export type StatusLabel = {
  label: string;
  tone: StatusTone;
};

export function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrencyAmount(value: string | number | null | undefined, symbol: string): string {
  if (value == null || value === "") return "Not set";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not set";
  return `${symbol}${amount.toLocaleString()}`;
}

export function formatAttendanceStatus(value: string | null | undefined): StatusLabel {
  const text = String(value ?? "").trim();
  const key = text.toLowerCase();
  if (!key) return { label: "Not set", tone: "neutral" };
  if (/present|attended|complete|done/.test(key)) return { label: text, tone: "success" };
  if (/absent|missed|no show|noshow/.test(key)) return { label: text, tone: "danger" };
  if (/late|partial|makeup/.test(key)) return { label: text, tone: "warning" };
  return { label: text, tone: "neutral" };
}

export function formatPaymentStatus(value: string | null | undefined): StatusLabel {
  const text = String(value ?? "").trim();
  const key = text.toLowerCase();
  if (!key) return { label: "Not set", tone: "neutral" };
  if (/paid|settled|cleared|received/.test(key)) return { label: text, tone: "success" };
  if (/overdue|unpaid|late|failed|due/.test(key)) return { label: text, tone: "danger" };
  if (/pending|partial|processing/.test(key)) return { label: text, tone: "warning" };
  return { label: text, tone: "neutral" };
}

export function statusColors(tone: StatusTone): { bg: string; text: string; border: string } {
  if (tone === "success") return { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" };
  if (tone === "warning") return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
  if (tone === "danger") return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" };
  return { bg: "var(--neutral-100)", text: "var(--neutral-600)", border: "var(--neutral-200)" };
}

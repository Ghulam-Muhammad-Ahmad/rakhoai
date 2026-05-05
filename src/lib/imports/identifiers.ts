import type { IdentifierQuality } from "./types.ts";

function cleanLabel(value: string): string {
  return value.toLowerCase().replace(/[\s_\-/.()]/g, "");
}

export function getIdentifierQuality(label: string): IdentifierQuality {
  const key = cleanLabel(label);

  if (
    key.includes("rownumber") ||
    key === "row" ||
    key === "srno" ||
    key === "serial" ||
    key === "serialno" ||
    key === "sno"
  ) {
    return {
      level: "invalid",
      label: "Row number",
      warning: "Row number is not a valid Student Identifier because sorting the sheet can change it.",
    };
  }

  if (
    key.includes("studentid") ||
    key.includes("rollno") ||
    key.includes("regno") ||
    key.includes("registrationno") ||
    key.includes("admissionno") ||
    key.includes("studentcode") ||
    key === "id"
  ) {
    return {
      level: "high",
      label: "Student ID / Roll No / Reg No",
      warning: "Best choice. This gives the most accurate matching.",
    };
  }

  if (key.includes("email")) {
    return {
      level: "medium",
      label: "Email",
      warning: "Good if every student has a unique email.",
    };
  }

  if (
    key.includes("phone") ||
    key.includes("mobile") ||
    key.includes("contact") ||
    key.includes("whatsapp")
  ) {
    return {
      level: "medium",
      label: "Phone",
      warning: "Good, but siblings may share one parent phone number. Review matches carefully.",
    };
  }

  return {
    level: "low",
    label: "Student Name",
    warning: "Risky. Names can be misspelled or duplicated. Rakho AI will ask you to review matches.",
  };
}

export function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("92") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length > 10) return digits.slice(1);
  return digits;
}

export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeName(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeIdentifier(value: unknown, quality: IdentifierQuality): string {
  if (quality.level === "high") return String(value ?? "").trim().toLowerCase();
  if (quality.label === "Email") return normalizeEmail(value);
  if (quality.label === "Phone") return normalizePhone(value);
  return normalizeName(value);
}

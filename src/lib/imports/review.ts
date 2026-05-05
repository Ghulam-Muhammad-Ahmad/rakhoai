import type {
  ExistingStudentForMatch,
  IdentifierSelection,
  StudentMatchResult,
} from "./types";

function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("92") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length > 10) return digits.slice(1);
  return digits;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeIdentifier(value: unknown, quality: IdentifierSelection["quality"]): string {
  if (quality.level === "high") return String(value ?? "").trim().toLowerCase();
  if (quality.label === "Email") return normalizeEmail(value);
  if (quality.label === "Phone") return normalizePhone(value);
  return normalizeName(value);
}

function uniqueById(students: ExistingStudentForMatch[]): ExistingStudentForMatch[] {
  const seen = new Set<string>();
  return students.filter((student) => {
    if (seen.has(student.id)) return false;
    seen.add(student.id);
    return true;
  });
}

function resultForCandidates(
  candidates: ExistingStudentForMatch[],
  confidence: StudentMatchResult["confidence"],
  reason: string
): StudentMatchResult {
  const unique = uniqueById(candidates);
  if (unique.length === 1 && confidence === "high") {
    return { status: "matched", studentId: unique[0].id, confidence, reason, candidates: unique };
  }
  if (unique.length === 1 && confidence === "medium") {
    return { status: "matched", studentId: unique[0].id, confidence, reason, candidates: unique };
  }
  if (unique.length === 1 && confidence === "low") {
    return { status: "needs_review", studentId: unique[0].id, confidence, reason, candidates: unique };
  }
  if (unique.length > 1) {
    return { status: "needs_review", studentId: null, confidence, reason: `${reason}; multiple students matched`, candidates: unique };
  }
  return { status: "unmatched", studentId: null, confidence: "none", reason: "No matching student found", candidates: [] };
}

export function matchStudentForImportRow(
  row: Record<string, unknown>,
  students: ExistingStudentForMatch[],
  identifier: IdentifierSelection
): StudentMatchResult {
  const rawValue = row[identifier.sourceColumn];
  const normalized = normalizeIdentifier(rawValue, identifier.quality);
  if (!normalized || identifier.quality.level === "invalid") {
    return {
      status: "unmatched",
      studentId: null,
      confidence: "none",
      reason: identifier.quality.warning,
      candidates: [],
    };
  }

  if (identifier.quality.level === "high") {
    return resultForCandidates(
      students.filter((student) => normalizeIdentifier(student.externalId, identifier.quality) === normalized),
      "high",
      "Exact Student Identifier match"
    );
  }

  if (identifier.quality.label === "Email") {
    return resultForCandidates(
      students.filter((student) => normalizeEmail(student.contact).includes(normalized)),
      "medium",
      "Normalized email match"
    );
  }

  if (identifier.quality.label === "Phone") {
    return resultForCandidates(
      students.filter((student) => normalizePhone(student.contact) === normalized),
      "medium",
      "Normalized phone match"
    );
  }

  return resultForCandidates(
    students.filter((student) => normalizeName(student.name) === normalized),
    "low",
    "Normalized name match"
  );
}

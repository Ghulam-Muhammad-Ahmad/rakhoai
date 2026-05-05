import type { EntityType } from "@/lib/imports/types";
import type { MappingResult } from "./index";

function normalizedLabel(value: string): string {
  return value.toLowerCase().replace(/[\s_\-()./]/g, "");
}

function looksLikeRowId(column: string): boolean {
  const key = normalizedLabel(column);
  return key.endsWith("id") || key.endsWith("number") || key.endsWith("no");
}

function isKnownStudentIdentifier(column: string): boolean {
  const key = normalizedLabel(column);
  return [
    "studentid",
    "studentcode",
    "rollno",
    "regno",
    "registrationno",
    "admissionno",
    "externalid",
  ].includes(key);
}

function isFirstName(column: string): boolean {
  return ["firstname", "fname", "givenname"].includes(normalizedLabel(column));
}

function isLastName(column: string): boolean {
  return ["lastname", "lname", "surname", "familyname"].includes(normalizedLabel(column));
}

function clearMapping(mapping: MappingResult): MappingResult {
  return { ...mapping, suggestedField: null, confidence: 0, layer: "unmapped" };
}

export function applyMappingGuardrails(mappings: MappingResult[], entityType: EntityType): MappingResult[] {
  let guarded = mappings.map((mapping) => {
    const key = normalizedLabel(mapping.sourceColumn);
    const target = mapping.suggestedField;

    if (entityType === "sessions" && key === "sessionid" && target === "last_session_date") {
      return clearMapping(mapping);
    }

    if (entityType === "payments" && key === "paymentid" && target === "last_payment_date") {
      return clearMapping(mapping);
    }

    if (
      looksLikeRowId(mapping.sourceColumn) &&
      !isKnownStudentIdentifier(mapping.sourceColumn) &&
      target &&
      ["session_date", "last_session_date", "payment_date", "last_payment_date"].includes(target)
    ) {
      return clearMapping(mapping);
    }

    return mapping;
  });

  const exactSubject = guarded.find((mapping) => normalizedLabel(mapping.sourceColumn) === "subject" && mapping.suggestedField === "subject");
  if (exactSubject) {
    guarded = guarded.map((mapping) => (
      mapping.sourceColumn !== exactSubject.sourceColumn &&
      normalizedLabel(mapping.sourceColumn) === "grade" &&
      mapping.suggestedField === "subject"
        ? clearMapping(mapping)
        : mapping
    ));
  }

  const hasStudentName = guarded.some((mapping) => mapping.suggestedField === "student_name");
  const first = guarded.find((mapping) => isFirstName(mapping.sourceColumn));
  const last = guarded.find((mapping) => isLastName(mapping.sourceColumn));
  const hasCombined = guarded.some((mapping) => mapping.sourceColumn === "FirstName + LastName");
  if (!hasStudentName && first && last && !hasCombined) {
    guarded = [
      ...guarded,
      {
        sourceColumn: `${first.sourceColumn} + ${last.sourceColumn}`,
        sampleValues: first.sampleValues.map((value, index) => `${value} ${last.sampleValues[index] ?? ""}`.trim()).filter(Boolean),
        suggestedField: "student_name",
        confidence: 0.96,
        layer: "exact",
      },
    ];
  }

  return guarded;
}

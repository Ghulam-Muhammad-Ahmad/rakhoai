export type EntityType = "students" | "teachers" | "sessions" | "payments";

export type ImportFormat =
  | "roster"
  | "teacher_list"
  | "long"
  | "wide"
  | "aggregate"
  | "transaction"
  | "monthly_wide"
  | "unknown";

export type IdentifierConfidence = "high" | "medium" | "low";

export type IdentifierQuality = {
  level: IdentifierConfidence | "invalid";
  label: string;
  warning: string;
};

export type IdentifierSelection = {
  sourceColumn: string;
  targetField: string;
  quality: IdentifierQuality;
};

export type ExistingStudentForMatch = {
  id: string;
  externalId: string | null;
  name: string;
  contact: string | null;
};

export type StudentMatchResult = {
  status: "matched" | "needs_review" | "unmatched";
  studentId: string | null;
  confidence: IdentifierConfidence | "none";
  reason: string;
  candidates: ExistingStudentForMatch[];
};

export type ImportReviewSummary = {
  totalRows: number;
  readyRows: number;
  duplicateRows: number;
  updatedRows: number;
  newRows: number;
  unmatchedRows: number;
  lowConfidenceRows: number;
  ignoredRows?: number;
  missingNames?: number;
  missingIdentifiers?: number;
};

export type NormalizedField<T> = {
  value: T | null;
  sourceType: string;
  originalValue: unknown;
  confidence: number;
};

export type NormalizationSummary = {
  field: string;
  label: string;
  groups: {
    raw: string;
    normalized: string | number | null;
    sourceType: string;
    confidence: number;
    count: number;
  }[];
  lowConfidenceCount: number;
  unknownCount: number;
};

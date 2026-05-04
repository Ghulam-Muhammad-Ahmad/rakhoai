export type CanonicalStudentInput = {
  externalId?: string | null;
  name: string;
  contact?: string | null;
  joinDate?: Date | null;
  lastSessionDate?: Date | null;
  attendanceRate?: number | null;
  paymentStatus?: string | null;
  lastPaymentDate?: Date | null;
  totalSessions?: number | null;
  feesAmount?: number | null;
  subject?: string | null;
  tutor?: string | null;
  rawData: Record<string, unknown>;
};

export type RiskBand = "HIGH" | "MEDIUM" | "LOW";

export type RuleScoreResult = {
  score: number;
  reasons: string[];
};

export type AiRiskResult = {
  studentKey: string;
  riskScore: number;
  riskBand: RiskBand;
  reasons: string[];
  recommendedAction: string;
  confidence: number;
};

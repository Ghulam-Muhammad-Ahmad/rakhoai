export type AlertRiskInput = {
  riskBand?: string | null;
};

export type HighRiskEmailAlertInput = {
  academyName: string;
  studentName: string;
  riskScore: number;
  reasons: string[];
  recommendedAction: string;
};

export function shouldQueueHighRiskAlert(risk: AlertRiskInput): boolean {
  return risk.riskBand === "HIGH";
}

export function getQueuedHighRiskAlertStatus(): "QUEUED" {
  return "QUEUED";
}

export function buildHighRiskEmailAlert(input: HighRiskEmailAlertInput) {
  const reasons = input.reasons.length
    ? input.reasons.map((reason) => `- ${reason}`).join("\n")
    : "- No specific reasons were returned.";

  return {
    subject: `High-risk student alert: ${input.studentName}`,
    body: [
      `${input.studentName} is newly flagged as high risk for ${input.academyName}.`,
      "",
      `Risk score: ${input.riskScore}/100`,
      "",
      "Reasons:",
      reasons,
      "",
      "Recommended action:",
      input.recommendedAction,
    ].join("\n"),
  };
}

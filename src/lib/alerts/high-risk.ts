import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import type { Database, Json } from "@/lib/db/database.types";
import { buildHighRiskEmailAlert, shouldQueueHighRiskAlert } from "./high-risk-core";

type RiskAssessmentRow = Database["public"]["Tables"]["RiskAssessment"]["Row"];
type StudentRow = Database["public"]["Tables"]["Student"]["Row"];

function reasonsFromJson(value: Json): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

export async function queueHighRiskAlert(args: {
  academyId: string;
  student: Pick<StudentRow, "id" | "name">;
  riskAssessment: RiskAssessmentRow;
}) {
  if (!shouldQueueHighRiskAlert(args.riskAssessment)) return null;

  const { data: existing, error: existingError } = await db
    .from("EmailAlert")
    .select("id")
    .eq("riskAssessmentId", args.riskAssessment.id)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to check existing alert: ${existingError.message}`);
  if (existing) return existing;

  const { data: academy, error: academyError } = await db
    .from("Academy")
    .select("name, ownerId")
    .eq("id", args.academyId)
    .single();

  if (academyError) throw new Error(`Failed to load academy for alert: ${academyError.message}`);

  const { data: ownerResult } = await db.auth.admin.getUserById(academy.ownerId);
  const recipientEmail = ownerResult.user?.email ?? `${academy.ownerId}@pending-email.local`;
  const message = buildHighRiskEmailAlert({
    academyName: academy.name,
    studentName: args.student.name,
    riskScore: args.riskAssessment.riskScore,
    reasons: reasonsFromJson(args.riskAssessment.reasonsJson),
    recommendedAction: args.riskAssessment.recommendedAction,
  });

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("EmailAlert")
    .insert({
      id: crypto.randomUUID(),
      academyId: args.academyId,
      studentId: args.student.id,
      riskAssessmentId: args.riskAssessment.id,
      recipientEmail,
      subject: message.subject,
      body: message.body,
      status: "QUEUED",
      createdAt: now,
      sentAt: null,
      errorMessage: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to queue high-risk alert`);
  return data;
}

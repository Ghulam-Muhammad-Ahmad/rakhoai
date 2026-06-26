import { adminDb } from "@/lib/db/client";
import { IN_MEMORY_FETCH_CAP } from "@/lib/pagination";
import type { Database, Json } from "@/lib/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  filterAndSortStudentRiskRows,
  getInitials,
  normalizeRiskLevel,
  selectLatestActionStatus,
  selectLatestRisk,
  type DbRiskBand,
  type RiskLevel,
  type StudentRiskFilters,
} from "./risk-core";

type StudentRow = Database["public"]["Tables"]["Student"]["Row"];
type RiskAssessmentRow = Database["public"]["Tables"]["RiskAssessment"]["Row"];
type ActionRow = Database["public"]["Tables"]["Action"]["Row"];

type StudentWithRelations = StudentRow & {
  riskAssessments?: RiskAssessmentRow[] | null;
  actions?: ActionRow[] | null;
};

export type StudentRiskListItem = {
  id: string;
  externalId: string | null;
  name: string;
  initials: string;
  contact: string | null;
  tutor: string | null;
  subject: string | null;
  classLabel: string;
  attendanceRate: number | null;
  attendanceLabel: string;
  feesAmount: number | null;
  feeLabel: string;
  paymentStatus: string | null;
  joinedLabel: string;
  lastSessionLabel: string;
  lastSessionDate: string | null;
  riskBand: DbRiskBand | null;
  riskLevel: RiskLevel;
  riskScore: number | null;
  reasons: string[];
  recommendedAction: string | null;
  confidence: number | null;
  computedAt: string | null;
  latestActionStatus: string | null;
};

export type StudentActionItem = {
  id: string;
  type: string;
  content: string | null;
  status: Database["public"]["Enums"]["ActionStatus"];
  notes: string | null;
  takenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentDetail = StudentRiskListItem & {
  joinDate: string | null;
  lastPaymentDate: string | null;
  totalSessions: number | null;
  rawDataJson: Json;
  actions: StudentActionItem[];
};

function formatMonth(dateValue: string | null): string {
  if (!dateValue) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(dateValue));
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateValue));
}

function formatFees(amount: number | null, paymentStatus: string | null, currencySymbol = "$"): string {
  if (paymentStatus && /overdue|unpaid/i.test(paymentStatus)) return paymentStatus;
  if (amount === null) return paymentStatus || "Unknown";
  return `${currencySymbol}${amount.toLocaleString()}`;
}

function reasonsFromJson(value: Json): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function toListItem(row: StudentWithRelations, currencySymbol = "$"): StudentRiskListItem {
  const latestRisk = selectLatestRisk(row.riskAssessments ?? []);
  const subject = row.subject || "Unassigned";

  return {
    id: row.id,
    externalId: row.externalId,
    name: row.name,
    initials: getInitials(row.name),
    contact: row.contact,
    tutor: row.tutor,
    subject: row.subject,
    classLabel: subject,
    attendanceRate: row.attendanceRate,
    attendanceLabel: row.attendanceRate === null ? "Unknown" : `${row.attendanceRate}%`,
    feesAmount: row.feesAmount,
    feeLabel: formatFees(row.feesAmount, row.paymentStatus, currencySymbol),
    paymentStatus: row.paymentStatus,
    joinedLabel: formatMonth(row.joinDate),
    lastSessionLabel: formatDate(row.lastSessionDate),
    lastSessionDate: row.lastSessionDate,
    riskBand: (latestRisk?.riskBand as DbRiskBand | undefined) ?? null,
    riskLevel: normalizeRiskLevel(latestRisk?.riskBand, latestRisk?.confidence),
    riskScore: latestRisk?.riskScore ?? null,
    reasons: latestRisk ? reasonsFromJson(latestRisk.reasonsJson) : [],
    recommendedAction: latestRisk?.recommendedAction ?? null,
    confidence: latestRisk?.confidence ?? null,
    computedAt: latestRisk?.computedAt ?? null,
    latestActionStatus: selectLatestActionStatus(row.actions),
  };
}

function toFilterableRow(item: StudentRiskListItem) {
  return {
    ...item,
    latestRisk: item.riskBand
      ? {
          riskBand: item.riskBand,
          riskScore: item.riskScore,
          confidence: item.confidence,
          computedAt: item.computedAt,
        }
      : null,
  };
}

export async function getStudentRiskList(
  academyId: string,
  filters: StudentRiskFilters = {},
  currencySymbol = "$",
  client?: SupabaseClient<Database>
): Promise<StudentRiskListItem[]> {
  const db = client ?? adminDb;
  // Only the latest risk assessment per student is needed for the list (the
  // rest is history); ordering + limiting the embedded resource at the DB avoids
  // pulling every assessment row into memory.
  const { data, error } = await db
    .from("Student")
    .select(`
      *,
      riskAssessments:RiskAssessment(*),
      actions:Action(id, status, createdAt, updatedAt)
    `)
    .eq("academyId", academyId)
    .order("computedAt", { referencedTable: "RiskAssessment", ascending: false })
    .limit(1, { referencedTable: "RiskAssessment" })
    .order("updatedAt", { ascending: false })
    // Safety cap: this list is filtered/sorted/paginated in memory by callers.
    .limit(IN_MEMORY_FETCH_CAP);

  if (error) throw new Error(`Failed to fetch students`);

  const items = ((data ?? []) as unknown as StudentWithRelations[]).map((row) => toListItem(row, currencySymbol));
  const filtered = filterAndSortStudentRiskRows(items.map(toFilterableRow), filters);
  return filtered.map((row) => {
    const { latestRisk, ...item } = row;
    void latestRisk;
    return item;
  });
}

export async function getStudentDetail(
  academyId: string,
  studentId: string,
  currencySymbol = "$",
  client?: SupabaseClient<Database>
): Promise<StudentDetail | null> {
  const db = client ?? adminDb;
  const { data, error } = await db
    .from("Student")
    .select(`
      *,
      riskAssessments:RiskAssessment(*),
      actions:Action(*)
    `)
    .eq("academyId", academyId)
    .eq("id", studentId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch student`);
  if (!data) return null;

  const row = data as unknown as StudentWithRelations;
  const listItem = toListItem(row, currencySymbol);
  const actions = [...(row.actions ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((action) => ({
      id: action.id,
      type: action.type,
      content: action.content,
      status: action.status,
      notes: action.notes,
      takenAt: action.takenAt,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
    }));

  return {
    ...listItem,
    joinDate: row.joinDate,
    lastPaymentDate: row.lastPaymentDate,
    totalSessions: row.totalSessions,
    rawDataJson: row.rawDataJson,
    actions,
  };
}

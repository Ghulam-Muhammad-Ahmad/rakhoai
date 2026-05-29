import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getStudentRiskList } from "@/lib/students/risk";
import { getCurrencySymbol } from "@/lib/currency";
import { db } from "@/lib/db/client";
import InterventionsClient, { type PendingIntervention, type SentAction } from "@/components/dashboard/InterventionsClient";

const TERMINAL = new Set(["DONE", "STUDENT_SAVED", "STUDENT_LOST"]);

type ActionWithStudent = {
  id: string;
  type: string;
  content: string | null;
  status: string;
  notes: string | null;
  takenAt: string | null;
  createdAt: string;
  updatedAt: string;
  studentId: string;
  Student: {
    name: string;
    contact: string | null;
    subject: string | null;
    attendanceRate: number | null;
    lastSessionDate: string | null;
    paymentStatus: string | null;
    lastPaymentDate: string | null;
  } | null;
};

export default async function InterventionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser?.academy) redirect("/onboarding");

  const academyId = dbUser.academy.id;
  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);

  const [students, actionsResult] = await Promise.all([
    getStudentRiskList(academyId, {}, currencySymbol),
    db
      .from("Action")
      .select(`
        id,
        type,
        content,
        status,
        notes,
        takenAt,
        createdAt,
        updatedAt,
        studentId,
        Student(name, contact, subject, attendanceRate, lastSessionDate, paymentStatus, lastPaymentDate)
      `)
      .eq("academyId", academyId)
      .in("status", ["PENDING", "IN_PROGRESS", "DONE", "STUDENT_SAVED", "STUDENT_LOST"])
      .order("createdAt", { ascending: false })
      .limit(50),
  ]);

  const pending: PendingIntervention[] = students
    .filter(
      (s) =>
        (s.riskBand === "HIGH" || s.riskBand === "MEDIUM") &&
        (!s.latestActionStatus || !TERMINAL.has(s.latestActionStatus))
    )
    .map((s) => ({
      studentId: s.id,
      name: s.name,
      initials: s.initials,
      riskBand: s.riskBand,
      recommendedAction: s.recommendedAction ?? "Check-in",
      reasons: s.reasons,
      computedAt: s.computedAt,
      contact: s.contact,
      subject: s.subject,
      attendanceLabel: s.attendanceLabel,
      lastSessionLabel: s.lastSessionLabel,
      paymentStatus: s.paymentStatus,
      feeLabel: s.feeLabel,
      confidence: s.confidence,
    }));

  const sent: SentAction[] = ((actionsResult.data ?? []) as unknown as ActionWithStudent[]).map((a) => ({
    id: a.id,
    type: a.type,
    content: a.content,
    status: a.status,
    notes: a.notes,
    takenAt: a.takenAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    studentId: a.studentId,
    studentName: a.Student?.name ?? "Unknown",
    contact: a.Student?.contact ?? null,
    subject: a.Student?.subject ?? null,
    attendanceRate: a.Student?.attendanceRate ?? null,
    lastSessionDate: a.Student?.lastSessionDate ?? null,
    paymentStatus: a.Student?.paymentStatus ?? null,
    lastPaymentDate: a.Student?.lastPaymentDate ?? null,
  }));

  return <InterventionsClient initialPending={pending} initialSent={sent} />;
}

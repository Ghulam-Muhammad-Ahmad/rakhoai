import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import type { Json } from "@/lib/db/database.types";
import { getOrCreateTutor } from "@/lib/tutors/tutors";

export const DEMO_TAG = "__rakhoai_demo";

type DemoAttendance = "attended" | "missed" | "cancelled";

type DemoStudentProfile = {
  externalId: string;
  name: string;
  contact: string;
  subject: string;
  tutor: string;
  monthlyFee: number;
  joinWeeksAgo: number;
  // attendance pattern per week, oldest -> newest (2 sessions/week).
  // Fewer than 8 weeks = the student stopped showing up (no rows = dropout
  // signal; the scorer counts "missed" rows as recent activity).
  weeks: [DemoAttendance, DemoAttendance][];
  // payment status for the last 3 billing months, oldest -> newest
  payments: ("paid" | "late" | "overdue" | "pending")[];
};

// Four contrasting profiles so the dashboard shows the full risk spectrum:
// healthy (LOW), silent dropout (HIGH), fading + unpaid (HIGH), wobbly (MEDIUM).
const PROFILES: DemoStudentProfile[] = [
  {
    externalId: "DEMO-001",
    name: "Ayesha Khan",
    contact: "0300-1112233",
    subject: "Mathematics",
    tutor: "Sir Imran",
    monthlyFee: 6000,
    joinWeeksAgo: 24,
    weeks: [
      ["attended", "attended"], ["attended", "attended"], ["attended", "attended"], ["attended", "attended"],
      ["attended", "attended"], ["attended", "cancelled"], ["attended", "attended"], ["attended", "attended"],
    ],
    payments: ["paid", "paid", "paid"],
  },
  {
    externalId: "DEMO-002",
    name: "Bilal Ahmed",
    contact: "0301-4445566",
    subject: "Physics",
    tutor: "Sir Imran",
    monthlyFee: 7500,
    joinWeeksAgo: 20,
    // attendance crumbles, then he disappears ~2.5 weeks ago
    weeks: [
      ["attended", "attended"], ["attended", "missed"], ["attended", "missed"],
      ["missed", "attended"], ["missed", "missed"], ["missed", "missed"],
    ],
    payments: ["paid", "late", "overdue"],
  },
  {
    externalId: "DEMO-003",
    name: "Fatima Noor",
    contact: "0333-7778899",
    subject: "English",
    tutor: "Miss Sana",
    monthlyFee: 5000,
    joinWeeksAgo: 16,
    weeks: [
      ["attended", "attended"], ["attended", "missed"], ["attended", "attended"], ["missed", "attended"],
      ["attended", "missed"], ["attended", "missed"], ["attended", "attended"], ["missed", "attended"],
    ],
    payments: ["paid", "overdue", "pending"],
  },
  {
    externalId: "DEMO-004",
    name: "Hamza Tariq",
    contact: "0345-2223344",
    subject: "Chemistry",
    tutor: "Miss Sana",
    monthlyFee: 6500,
    joinWeeksAgo: 18,
    // hasn't been seen in over 3 weeks — classic churn
    weeks: [
      ["attended", "attended"], ["attended", "missed"], ["attended", "missed"],
      ["missed", "attended"], ["missed", "missed"],
    ],
    payments: ["paid", "overdue", "overdue"],
  },
];

const TOTAL_WEEKS = 8;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(11, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function billingMonthLabel(monthsBack: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function academyHasStudents(academyId: string): Promise<boolean> {
  const { count, error } = await db
    .from("Student")
    .select("id", { count: "exact", head: true })
    .eq("academyId", academyId);
  if (error) throw new Error(`Failed to count students`);
  return (count ?? 0) > 0;
}

export async function academyHasDemoData(academyId: string): Promise<boolean> {
  const { data, error } = await db
    .from("Student")
    .select("id")
    .eq("academyId", academyId)
    .contains("rawDataJson", { [DEMO_TAG]: true })
    .limit(1);
  if (error) throw new Error(`Failed to check demo data`);
  return (data?.length ?? 0) > 0;
}

export async function seedDemoData(academyId: string) {
  const now = new Date().toISOString();

  // Demo "uploads" so the dashboard treats sessions/payments as imported
  // (hasStructuredRisk checks PROCESSED uploads per entityType).
  const uploadIds: Record<string, string> = {};
  for (const entityType of ["students", "sessions", "payments"] as const) {
    const id = crypto.randomUUID();
    uploadIds[entityType] = id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from("Upload").insert({
      id,
      academyId,
      fileName: `Demo data — ${entityType}`,
      status: "PROCESSED",
      entityType,
      rowCount: entityType === "students" ? PROFILES.length : null,
      processedAt: now,
      mappingJson: { [DEMO_TAG]: true },
    });
    if (error) throw new Error(`Failed to create demo upload (${entityType})`);
  }

  let sessionsCreated = 0;
  let paymentsCreated = 0;

  for (const profile of PROFILES) {
    const tutor = await getOrCreateTutor(academyId, profile.tutor);

    // 2 sessions per week (Mon + Thu), oldest week first. A profile with
    // fewer than TOTAL_WEEKS entries simply has no recent rows.
    const sessions = profile.weeks.flatMap((week, weekIndex) =>
      week.map((status, slot) => ({
        status,
        date: daysAgo((TOTAL_WEEKS - weekIndex) * 7 - (slot === 0 ? 1 : 4)),
      }))
    );
    const counted = sessions.filter((s) => s.status !== "cancelled");
    const attendedCount = counted.filter((s) => s.status === "attended").length;
    const countedDates = counted.map((s) => s.date.getTime());
    const lastSessionDate = countedDates.length ? new Date(Math.max(...countedDates)) : null;

    const latestPayment = profile.payments[profile.payments.length - 1];
    const paidMonths = profile.payments
      .map((status, i) => ({ status, monthsBack: profile.payments.length - 1 - i }))
      .filter((p) => p.status === "paid" || p.status === "late");
    const lastPaidMonthsBack = paidMonths.length ? paidMonths[paidMonths.length - 1].monthsBack : null;

    const studentId = crypto.randomUUID();
    const { error: studentError } = await db.from("Student").insert({
      id: studentId,
      academyId,
      uploadId: uploadIds.students,
      externalId: profile.externalId,
      name: profile.name,
      contact: profile.contact,
      subject: profile.subject,
      tutor: profile.tutor,
      feesAmount: profile.monthlyFee,
      joinDate: daysAgo(profile.joinWeeksAgo * 7).toISOString(),
      attendanceRate: counted.length ? Math.round((attendedCount / counted.length) * 100) : null,
      lastSessionDate: lastSessionDate?.toISOString() ?? null,
      totalSessions: counted.length,
      paymentStatus: latestPayment === "late" ? "paid" : latestPayment,
      lastPaymentDate: lastPaidMonthsBack != null ? daysAgo(lastPaidMonthsBack * 30 + 5).toISOString() : null,
      updatedAt: now,
      rawDataJson: { [DEMO_TAG]: true, source: "demo-seed" } as Json,
    });
    if (studentError) throw new Error(`Failed to create demo student ${profile.name}: ${studentError.message}`);

    // Attach tutorId when the column exists (newer schema); ignore failure.
    if (tutor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("Student").update({ tutorId: tutor.id }).eq("id", studentId);
    }

    for (const session of sessions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("Session").insert({
        id: crypto.randomUUID(),
        academyId,
        studentId,
        uploadId: uploadIds.sessions,
        sessionDate: session.date.toISOString(),
        attendanceStatus: session.status,
        rawStatus: session.status,
        isCancelled: session.status === "cancelled",
        isRescheduled: false,
        teacherId: tutor?.id ?? null,
        teacherName: profile.tutor,
        subject: profile.subject,
        durationMinutes: 60,
        rawDataJson: { [DEMO_TAG]: true } as Json,
      });
      if (error) throw new Error(`Failed to create demo session`);
      sessionsCreated++;
    }

    for (let i = 0; i < profile.payments.length; i++) {
      const status = profile.payments[i];
      const monthsBack = profile.payments.length - 1 - i;
      const dueDate = daysAgo(monthsBack * 30 + 10);
      const paidDate =
        status === "paid" ? daysAgo(monthsBack * 30 + 8)
        : status === "late" ? daysAgo(monthsBack * 30 + 1)
        : null;
      // Unpaid rows still carry paymentDate = dueDate so the scorer's
      // "latest payment" sort (by paymentDate) sees the newest status.
      const paymentDate = paidDate ?? dueDate;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from("Payment").insert({
        id: crypto.randomUUID(),
        academyId,
        studentId,
        uploadId: uploadIds.payments,
        billingMonth: billingMonthLabel(monthsBack),
        dueDate: dueDate.toISOString(),
        paidDate: paidDate?.toISOString() ?? null,
        paymentDate: paymentDate.toISOString(),
        amount: profile.monthlyFee,
        paymentStatus: status === "late" ? "paid" : status,
        rawStatus: status,
        isLate: status === "late" || status === "overdue",
        daysLate: status === "late" ? 9 : status === "overdue" ? Math.max(1, monthsBack * 30) : 0,
        overdueAmount: status === "overdue" ? profile.monthlyFee : null,
        method: paidDate ? "cash" : null,
        rawDataJson: { [DEMO_TAG]: true } as Json,
      });
      if (error) throw new Error(`Failed to create demo payment`);
      paymentsCreated++;
    }
  }

  return {
    students: PROFILES.length,
    tutors: 2,
    sessions: sessionsCreated,
    payments: paymentsCreated,
  };
}

export async function deleteDemoData(academyId: string) {
  const { data: demoStudents, error: loadError } = await db
    .from("Student")
    .select("id")
    .eq("academyId", academyId)
    .contains("rawDataJson", { [DEMO_TAG]: true });
  if (loadError) throw new Error(`Failed to load demo students: ${loadError.message}`);
  const studentIds = (demoStudents ?? []).map((s) => s.id);

  if (studentIds.length > 0) {
    await db.from("EmailAlert").delete().in("studentId", studentIds);
    await db.from("Action").delete().in("studentId", studentIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("Payment").delete().in("studentId", studentIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("Session").delete().in("studentId", studentIds);
    await db.from("RiskAssessment").delete().in("studentId", studentIds);
    await db.from("Student").delete().in("id", studentIds);
  }

  // Demo uploads are tagged via mappingJson.
  await db
    .from("Upload")
    .delete()
    .eq("academyId", academyId)
    .contains("mappingJson", { [DEMO_TAG]: true });

  return { students: studentIds.length };
}

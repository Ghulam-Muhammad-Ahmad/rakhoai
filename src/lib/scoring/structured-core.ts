import type { CanonicalStudentInput } from "./types";

export type StructuredStudentRow = {
  id: string;
  name: string;
  externalId: string | null;
  contact: string | null;
  subject: string | null;
  tutor: string | null;
  feesAmount: number | string | null;
  rawDataJson: Record<string, unknown>;
};

export type StructuredSessionRow = {
  studentId: string;
  sessionDate: string | null;
  attendanceStatus: string | null;
  rawStatus?: string | null;
};

export type StructuredPaymentRow = {
  studentId: string;
  paymentDate: string | null;
  paymentStatus: string | null;
  rawStatus?: string | null;
  isLate?: boolean | null;
  amount: number | string | null;
  overdueAmount: number | string | null;
};

export type StructuredConfidence = {
  level: "high" | "medium" | "low";
  label: string;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type NormalizedAttendanceStatus = "attended" | "missed" | "cancelled" | "rescheduled" | "unknown";

export function normalizeStructuredAttendanceStatus(status: string | null): NormalizedAttendanceStatus {
  const text = (status ?? "").trim().toLowerCase();
  if (!text) return "unknown";
  if (/resched|re-sched|postpon/.test(text)) return "rescheduled";
  if (/cancel|called off/.test(text)) return "cancelled";
  if (/no\s*show|noshow|absent|missed/.test(text)) return "missed";
  if (/present|attended|complete|done/.test(text)) return "attended";
  return "unknown";
}

export function normalizeStructuredPaymentStatus(value: string | null): {
  paymentStatus: "paid" | "overdue" | "pending" | "partial" | null;
  rawStatus: string | null;
  isLate: boolean;
} {
  const rawStatus = value == null || String(value).trim() === "" ? null : String(value).trim();
  const lower = rawStatus?.toLowerCase() ?? "";
  const isLate = /late|overdue|past due|past-due|arrears/.test(lower);

  if (!rawStatus) return { paymentStatus: null, rawStatus, isLate: false };
  if (/paid|cleared|settled|complete|done|received|ok/.test(lower)) {
    return { paymentStatus: "paid", rawStatus, isLate };
  }
  if (/overdue|late|past due|past-due|arrears|unpaid|not paid/.test(lower)) {
    return { paymentStatus: "overdue", rawStatus, isLate: true };
  }
  if (/partial|part paid|part-paid|incomplete|half|installment/.test(lower)) {
    return { paymentStatus: "partial", rawStatus, isLate };
  }
  if (/pending|due|upcoming|outstanding|awaiting|not yet/.test(lower)) {
    return { paymentStatus: "pending", rawStatus, isLate };
  }
  return { paymentStatus: null, rawStatus, isLate };
}

function latestDate<T>(rows: T[], getValue: (row: T) => string | null): Date | null {
  return rows
    .map((row) => parseDate(getValue(row)))
    .filter((date): date is Date => !!date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

export function buildStructuredStudentSignals(args: {
  students: StructuredStudentRow[];
  sessions: StructuredSessionRow[];
  payments: StructuredPaymentRow[];
  now?: Date;
}): CanonicalStudentInput[] {
  return args.students.map((student) => {
    const studentSessions = args.sessions.filter((session) => session.studentId === student.id);
    const studentPayments = args.payments.filter((payment) => payment.studentId === student.id);
    const sessionsWithStatus = studentSessions.map((session) => ({
      ...session,
      normalizedStatus: normalizeStructuredAttendanceStatus(session.attendanceStatus),
    }));
    const attended = sessionsWithStatus.filter((session) => session.normalizedStatus === "attended").length;
    const missed = sessionsWithStatus.filter((session) => session.normalizedStatus === "missed").length;
    const cancelled = sessionsWithStatus.filter((session) => session.normalizedStatus === "cancelled").length;
    const rescheduled = sessionsWithStatus.filter((session) => session.normalizedStatus === "rescheduled").length;
    const counted = attended + missed;
    const latestPayment = [...studentPayments]
      .sort((a, b) => (parseDate(b.paymentDate)?.getTime() ?? 0) - (parseDate(a.paymentDate)?.getTime() ?? 0))[0];
    const latestPaymentStatus = normalizeStructuredPaymentStatus(latestPayment?.rawStatus ?? latestPayment?.paymentStatus ?? null);
    const latePayments = studentPayments.filter((payment) => {
      const normalized = normalizeStructuredPaymentStatus(payment.rawStatus ?? payment.paymentStatus);
      return payment.isLate === true || normalized.isLate;
    }).length;
    const lastCountedSessionDate = latestDate(
      sessionsWithStatus.filter((session) => session.normalizedStatus === "attended" || session.normalizedStatus === "missed"),
      (session) => session.sessionDate
    );

    return {
      sourceStudentId: student.id,
      externalId: student.externalId,
      name: student.name,
      contact: student.contact,
      lastSessionDate: lastCountedSessionDate,
      attendanceRate: counted > 0 ? Math.round((attended / counted) * 100) : null,
      paymentStatus: latestPaymentStatus.paymentStatus,
      lastPaymentDate: latestDate(studentPayments, (payment) => payment.paymentDate),
      totalSessions: counted,
      feesAmount: student.feesAmount == null ? null : Number(student.feesAmount),
      subject: student.subject,
      tutor: student.tutor,
      rawData: {
        ...student.rawDataJson,
        structuredSignals: {
          attendedSessions: attended,
          missedSessions: missed,
          cancelledSessions: cancelled,
          rescheduledSessions: rescheduled,
          countedSessions: counted,
          lastCountedSessionDate: lastCountedSessionDate?.toISOString() ?? null,
          paymentRows: studentPayments.length,
          paymentDataMissing: studentPayments.length === 0,
          latePayments,
          latestPaymentRawStatus: latestPaymentStatus.rawStatus,
          latestPaymentIsLate: latestPaymentStatus.isLate,
        },
      },
    };
  });
}

export function getStructuredRiskConfidence(args: {
  hasStudentIdentifier: boolean;
  hasSessions: boolean;
  hasPayments: boolean;
  latestDataAt: Date | null;
  now?: Date;
}): StructuredConfidence {
  const now = args.now ?? new Date();
  const ageDays = args.latestDataAt
    ? Math.floor((now.getTime() - args.latestDataAt.getTime()) / 86_400_000)
    : 999;

  if (args.hasStudentIdentifier && args.hasSessions && args.hasPayments && ageDays <= 14) {
    return { level: "high", label: "High confidence" };
  }
  if (args.hasSessions && !args.hasPayments && ageDays <= 30) {
    return { level: "medium", label: "Medium confidence; payment data missing" };
  }
  if (args.hasPayments && !args.hasSessions && ageDays <= 30) {
    return { level: "medium", label: "Medium confidence; session data missing" };
  }
  if (ageDays > 30 || !args.hasStudentIdentifier || (!args.hasSessions && !args.hasPayments)) {
    return { level: "low", label: "Low confidence" };
  }
  return { level: "medium", label: "Medium confidence" };
}

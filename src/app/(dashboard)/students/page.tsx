import { Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { StudentsFilterBar } from "@/components/students/StudentsFilterBar";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getStudentRiskList } from "@/lib/students/risk";
import { getCurrencySymbol } from "@/lib/currency";
import type { RiskBandFilter, SortDirection, StudentRiskSort } from "@/lib/students/risk-core";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseBand(value: string | undefined): RiskBandFilter | undefined {
  const upper = value?.toUpperCase();
  if (upper === "HIGH" || upper === "MEDIUM" || upper === "LOW" || upper === "AT_RISK" || upper === "ALL") {
    return upper as RiskBandFilter;
  }
  return undefined;
}

function parseSort(value: string | undefined): StudentRiskSort | undefined {
  if (value === "riskScore" || value === "lastSessionDate" || value === "feesAmount" || value === "name") return value;
  return undefined;
}

function parseDirection(value: string | undefined): SortDirection | undefined {
  if (value === "asc" || value === "desc") return value;
  return undefined;
}

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);
  const allStudents = await getStudentRiskList(dbUser.academy.id, { sort: "riskScore", direction: "desc" }, currencySymbol);
  const students = await getStudentRiskList(dbUser.academy.id, {
    band: parseBand(first(params.band)),
    tutor: first(params.tutor),
    subject: first(params.subject),
    query: first(params.q),
    sort: parseSort(first(params.sort)),
    direction: parseDirection(first(params.direction)),
  }, currencySymbol);

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Roster · {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Students</h1>
        </div>
        <Link href="/uploads/new" style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Upload size={14} /> Import CSV
        </Link>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        <StudentsFilterBar students={allStudents} />

        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 1fr 1fr 0.8fr 40px", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
          <div>Student</div><div>Subject</div><div>Attendance</div><div>Risk</div><div>Fees</div><div />
        </div>

        {students.map((student) => (
          <Link key={student.id} href={`/students/${student.id}`} style={{
            display: "grid", gridTemplateColumns: "1.8fr 0.9fr 1fr 1fr 0.8fr 40px",
            padding: "12px 20px", alignItems: "center",
            borderBottom: "1px solid var(--neutral-100)", gap: 12,
            fontSize: 14, cursor: "pointer", textDecoration: "none", color: "inherit",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Avatar initials={student.initials} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.name}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{student.externalId ?? student.id} · joined {student.joinedLabel}</div>
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{student.classLabel}</div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)" }}>{student.attendanceLabel}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RiskBadge level={student.riskLevel} />
              {student.riskScore !== null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--neutral-500)" }}>{student.riskScore}</span>}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", color: /overdue|unpaid/i.test(student.feeLabel) ? "var(--error)" : "var(--neutral-700)" }}>{student.feeLabel}</div>
            <div style={{ color: "var(--neutral-400)", textAlign: "right" }}>›</div>
          </Link>
        ))}

        {students.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
            No students match that filter.
          </div>
        )}
      </div>
    </div>
  );
}

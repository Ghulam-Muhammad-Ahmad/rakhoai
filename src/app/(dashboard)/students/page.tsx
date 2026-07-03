import { Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentsBrowser } from "@/components/students/StudentsBrowser";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getStudentRiskList } from "@/lib/students/risk";
import { getCurrencySymbol } from "@/lib/currency";

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser.academy) redirect("/onboarding");

  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);
  // Unfiltered list feeds the filter bar's band counts; the table fetches its
  // own paginated/filtered pages from /api/students.
  const allStudents = await getStudentRiskList(dbUser.academy.id, { sort: "riskScore", direction: "desc" }, currencySymbol, sb);

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Roster - {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Students</h1>
        </div>
        <Link href="/uploads/new" style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Upload size={14} /> Import CSV
        </Link>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        <StudentsBrowser allStudents={allStudents} />
      </div>
    </div>
  );
}

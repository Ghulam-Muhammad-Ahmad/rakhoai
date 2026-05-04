import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getTutorStats } from "@/lib/tutors/tutors";
import { getCurrencySymbol } from "@/lib/currency";

export default async function TutorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);
  const tutors = await getTutorStats(dbUser.academy.id);

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Tutor risk overview</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Tutors</h1>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(7, 1fr)", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
          <div>Tutor</div><div>Students</div><div>High</div><div>Medium</div><div>Avg risk</div><div>Attendance</div><div>Revenue risk</div><div>Pending</div>
        </div>
        {tutors.map((tutor) => (
          <div key={tutor.name} style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(7, 1fr)", padding: "12px 20px", borderBottom: "1px solid var(--neutral-100)", gap: 12, fontSize: 14, alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--neutral-900)" }}>{tutor.name}</div>
            <div>{tutor.assignedStudents}</div>
            <div style={{ color: "var(--error)", fontWeight: 700 }}>{tutor.highRiskStudents}</div>
            <div>{tutor.mediumRiskStudents}</div>
            <div>{tutor.averageRiskScore}</div>
            <div>{tutor.averageAttendance}%</div>
            <div>{currencySymbol}{tutor.revenueAtRisk.toLocaleString()}</div>
            <div>{tutor.pendingActions}</div>
          </div>
        ))}
        {tutors.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--neutral-500)" }}>
            No tutor data yet. Upload mapped student data with a tutor column to populate this page.
          </div>
        )}
      </div>
    </div>
  );
}

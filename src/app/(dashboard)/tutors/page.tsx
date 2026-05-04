import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getTutorStats } from "@/lib/tutors/tutors";
import { getCurrencySymbol } from "@/lib/currency";
import Avatar from "@/components/ui/Avatar";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Tutor risk overview · {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Tutors</h1>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--neutral-500)" }}>
          {tutors.length} tutor{tutors.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.7fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 0.7fr", padding: "12px 20px", background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-100)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--neutral-500)", fontWeight: 600, gap: 12 }}>
          <div>Tutor</div>
          <div>Students</div>
          <div>High risk</div>
          <div>Medium</div>
          <div>Avg risk</div>
          <div>Attendance</div>
          <div>Revenue risk</div>
          <div>Pending</div>
        </div>

        {tutors.map((tutor) => (
          <div key={tutor.name} style={{
            display: "grid", gridTemplateColumns: "1.8fr 0.7fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 0.7fr",
            padding: "12px 20px", alignItems: "center",
            borderBottom: "1px solid var(--neutral-100)", gap: 12,
            fontSize: 14,
          }}>
            {/* Name + avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Avatar initials={getInitials(tutor.name)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tutor.name}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{tutor.studentsSaved} saved this month</div>
              </div>
            </div>

            {/* Students count */}
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{tutor.assignedStudents}</div>

            {/* High risk */}
            <div style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
              {tutor.highRiskStudents > 0 ? (
                <span style={{ color: "var(--error)", fontWeight: 700 }}>{tutor.highRiskStudents}</span>
              ) : (
                <span style={{ color: "var(--neutral-400)" }}>0</span>
              )}
            </div>

            {/* Medium risk */}
            <div style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
              {tutor.mediumRiskStudents > 0 ? (
                <span style={{ color: "#D97706", fontWeight: 600 }}>{tutor.mediumRiskStudents}</span>
              ) : (
                <span style={{ color: "var(--neutral-400)" }}>0</span>
              )}
            </div>

            {/* Avg risk score */}
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{tutor.averageRiskScore}</div>

            {/* Attendance */}
            <div style={{ fontFamily: "var(--font-mono)", color: tutor.averageAttendance < 70 ? "var(--error)" : tutor.averageAttendance < 85 ? "#D97706" : "var(--neutral-700)", fontVariantNumeric: "tabular-nums" }}>{tutor.averageAttendance}%</div>

            {/* Revenue at risk */}
            <div style={{ fontFamily: "var(--font-mono)", color: tutor.revenueAtRisk > 0 ? "var(--error)" : "var(--neutral-400)", fontVariantNumeric: "tabular-nums" }}>
              {tutor.revenueAtRisk > 0 ? `${currencySymbol}${tutor.revenueAtRisk.toLocaleString()}` : "—"}
            </div>

            {/* Pending actions */}
            <div style={{ fontFamily: "var(--font-mono)", color: tutor.pendingActions > 0 ? "var(--warning)" : "var(--neutral-400)", fontVariantNumeric: "tabular-nums" }}>
              {tutor.pendingActions > 0 ? tutor.pendingActions : "—"}
            </div>
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

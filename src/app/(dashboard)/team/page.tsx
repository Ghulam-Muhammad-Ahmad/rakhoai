import { redirect } from "next/navigation";
import { Users, UserRound, AlertTriangle } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getStudentRiskList } from "@/lib/students/risk";

type TutorSummary = {
  name: string;
  initials: string;
  totalStudents: number;
  highRisk: number;
  mediumRisk: number;
  subjects: string[];
};

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const students = await getStudentRiskList(dbUser.academy.id, {
    sort: "name",
    direction: "asc",
  });

  const tutors = [...students.reduce((map, student) => {
    if (!student.tutor) return map;
    const existing = map.get(student.tutor) ?? {
      name: student.tutor,
      initials: student.tutor.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "T",
      totalStudents: 0,
      highRisk: 0,
      mediumRisk: 0,
      subjects: [],
    } satisfies TutorSummary;

    existing.totalStudents += 1;
    if (student.riskBand === "HIGH") existing.highRisk += 1;
    if (student.riskBand === "MEDIUM") existing.mediumRisk += 1;
    if (student.subject && !existing.subjects.includes(student.subject)) existing.subjects.push(student.subject);
    map.set(student.tutor, existing);
    return map;
  }, new Map<string, TutorSummary>()).values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>{dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Team</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-700)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Users size={14} /> {tutors.length} tutors
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {tutors.map((tutor) => (
          <div key={tutor.name} style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Avatar initials={tutor.initials} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--neutral-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tutor.name}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{tutor.subjects.length ? tutor.subjects.join(", ") : "No subject assigned"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div style={{ border: "1px solid var(--neutral-100)", borderRadius: "var(--radius-md)", padding: 10 }}>
                <div style={{ fontSize: 11, color: "var(--neutral-500)", textTransform: "uppercase", fontWeight: 700 }}>Students</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--neutral-900)", marginTop: 4 }}>{tutor.totalStudents}</div>
              </div>
              <div style={{ border: "1px solid var(--neutral-100)", borderRadius: "var(--radius-md)", padding: 10 }}>
                <div style={{ fontSize: 11, color: "var(--neutral-500)", textTransform: "uppercase", fontWeight: 700 }}>High</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--error)", marginTop: 4 }}>{tutor.highRisk}</div>
              </div>
              <div style={{ border: "1px solid var(--neutral-100)", borderRadius: "var(--radius-md)", padding: 10 }}>
                <div style={{ fontSize: 11, color: "var(--neutral-500)", textTransform: "uppercase", fontWeight: 700 }}>Medium</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--warning)", marginTop: 4 }}>{tutor.mediumRisk}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {tutor.highRisk > 0 && <RiskBadge level="high" />}
              {tutor.mediumRisk > 0 && <RiskBadge level="medium" />}
              {tutor.highRisk === 0 && tutor.mediumRisk === 0 && <RiskBadge level="safe" />}
            </div>
          </div>
        ))}
      </div>

      {tutors.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 32, textAlign: "center", boxShadow: "var(--shadow-xs)" }}>
          <UserRound size={28} color="var(--neutral-400)" style={{ margin: "0 auto 10px" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--neutral-900)" }}>No tutors found</div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)", marginTop: 6 }}>Upload data with a tutor column to populate this page.</div>
        </div>
      )}

      {students.some((student) => !student.tutor) && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, color: "var(--neutral-600)", fontSize: 13 }}>
          <AlertTriangle size={16} color="var(--warning)" />
          Some students do not have a tutor assigned yet.
        </div>
      )}
    </div>
  );
}

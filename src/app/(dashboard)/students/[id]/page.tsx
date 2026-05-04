import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Phone, User, Mail, UserRound, CheckCircle2, AlertCircle, CreditCard, MoreHorizontal } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { AreaChart } from "@/components/ui/Charts";
import { ActionStatusPanel } from "@/components/students/ActionStatusPanel";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getStudentDetail } from "@/lib/students/risk";
import { getCurrencySymbol } from "@/lib/currency";

type Params = { params: Promise<{ id: string }> };

function activityTone(status: string) {
  if (status === "STUDENT_SAVED" || status === "DONE") return "var(--success)";
  if (status === "STUDENT_LOST") return "var(--error)";
  return "var(--warning)";
}

export default async function StudentProfilePage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const student = await getStudentDetail(dbUser.academy.id, id, getCurrencySymbol(dbUser.academy.currency));
  if (!student) notFound();

  const trend = ["U1", "U2", "U3", "U4", "U5", "Now"].map((month) => ({
    month,
    rate: student.attendanceRate ?? 0,
  }));

  const infoRows = [
    { Icon: User, label: "Contact", val: student.contact ?? "Unknown" },
    { Icon: Phone, label: "Phone", val: student.contact ?? "Unknown" },
    { Icon: Mail, label: "External ID", val: student.externalId ?? "None" },
    { Icon: UserRound, label: "Tutor", val: student.tutor ?? "Unassigned" },
  ];

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13, color: "var(--neutral-500)" }}>
        <Link href="/students" style={{ cursor: "pointer", color: "var(--neutral-500)", textDecoration: "none" }}>← Students</Link>
        <span>/</span>
        <span style={{ color: "var(--neutral-700)" }}>{student.name}</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Avatar initials={student.initials} size="lg" />
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.01em" }}>{student.name}</h2>
            <div style={{ fontSize: 13, color: "var(--neutral-500)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span>{student.externalId ?? student.id}</span><span>·</span><span>{student.classLabel}</span><span>·</span><span>Joined {student.joinedLabel}</span>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <RiskBadge level={student.riskLevel} />
              {student.riskScore !== null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--neutral-600)" }}>{student.riskScore}/100</span>}
              <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "var(--radius-full)", background: "var(--neutral-100)", color: "var(--neutral-600)", fontSize: 11, fontWeight: 600 }}>{student.feeLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Attendance snapshot</div>
              <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>Latest upload</div>
            </div>
            <AreaChart data={trend} fill="#FEE2E2" color="#DC2626" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--neutral-500)", marginTop: 8 }}>
              <span>Previous uploads</span><span>Current · {student.attendanceLabel}</span>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 14 }}>Risk reasons</div>
            {student.reasons.length > 0 ? student.reasons.map((reason) => (
              <div key={reason} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--neutral-100)" }}>
                <AlertCircle size={16} color="var(--warning)" />
                <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)" }}>{reason}</div>
              </div>
            )) : (
              <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>No risk reasons are available yet.</div>
            )}
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 14 }}>Recent actions</div>
            {student.actions.length > 0 ? student.actions.map((action) => (
              <div key={action.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--neutral-100)" }}>
                {action.status === "PENDING" || action.status === "IN_PROGRESS" ? <AlertCircle size={16} color={activityTone(action.status)} /> : <CheckCircle2 size={16} color={activityTone(action.status)} />}
                <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)" }}>
                  <strong>{action.type}</strong> · {action.status}
                  {action.notes && <div style={{ color: "var(--neutral-500)", marginTop: 3 }}>{action.notes}</div>}
                </div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{new Date(action.updatedAt).toLocaleDateString()}</div>
              </div>
            )) : (
              <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>No action has been logged for this student yet.</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--primary-50)", border: "1px solid var(--primary-100)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--primary-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13 }}>R</div>
            <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }}>Suggested next step</strong>
              <div style={{ marginTop: 6 }}>{student.recommendedAction ?? "No recommended action has been generated yet."}</div>
              {student.confidence !== null && <span style={{ display: "block", fontSize: 12, color: "var(--neutral-500)", marginTop: 6 }}>Confidence {(student.confidence * 100).toFixed(0)}%</span>}
            </div>
          </div>

          <ActionStatusPanel student={student} />

          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Student info</div>
              <MoreHorizontal size={16} color="var(--neutral-400)" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {infoRows.map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                  <row.Icon size={14} color="var(--neutral-400)" />
                  <span style={{ color: "var(--neutral-500)", width: 80, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ color: "var(--neutral-800)", fontWeight: 500 }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                <CreditCard size={14} color="var(--neutral-400)" />
                <span style={{ color: "var(--neutral-500)", width: 80, flexShrink: 0 }}>Payment</span>
                <span style={{ color: "var(--neutral-800)", fontWeight: 500 }}>{student.paymentStatus ?? "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

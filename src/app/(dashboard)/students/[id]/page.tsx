import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, MessageCircle, User, Mail, MapPin, UserRound, CheckCircle2, AlertCircle, XCircle, CreditCard, MoreHorizontal } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import RiskBadge from "@/components/ui/RiskBadge";
import { AreaChart } from "@/components/ui/Charts";
import { STUDENTS } from "@/lib/data";

const trend = [92, 90, 88, 84, 78, 72, 68, 64, 62, 60, 58, 62];

const activity = [
  { Icon: XCircle,       text: "Missed Math · Mon 10:00",      time: "2 days ago",  tone: "var(--error)"   },
  { Icon: AlertCircle,   text: "Late by 22 min · Sun",          time: "3 days ago",  tone: "var(--warning)" },
  { Icon: CheckCircle2,  text: "Submitted Physics worksheet",   time: "5 days ago",  tone: "var(--success)" },
  { Icon: CreditCard,    text: "Fee paid · ₹3,200",             time: "12 days ago", tone: "var(--neutral-500)" },
];

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const student = STUDENTS.find(s => s.id === params.id);
  if (!student) notFound();

  const infoRows = [
    { Icon: User,      label: "Guardian", val: "Mrs. Anjali Sharma" },
    { Icon: Phone,     label: "Phone",    val: student.phone },
    { Icon: Mail,      label: "Email",    val: student.id.toLowerCase() + "@brightfuture.in" },
    { Icon: MapPin,    label: "Center",   val: "Karachi · Gulshan" },
    { Icon: UserRound, label: "Tutor",    val: "Mr. Imran Qureshi" },
  ];

  return (
    <div className="page-fade">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13, color: "var(--neutral-500)" }}>
        <Link href="/students" style={{ cursor: "pointer", color: "var(--neutral-500)", textDecoration: "none" }}>← Students</Link>
        <span>/</span>
        <span style={{ color: "var(--neutral-700)" }}>{student.name}</span>
      </div>

      {/* Profile header card */}
      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Avatar initials={student.initials} tone={student.tone} size="lg" />
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.01em" }}>{student.name}</h2>
            <div style={{ fontSize: 13, color: "var(--neutral-500)", marginTop: 4, display: "flex", gap: 12 }}>
              <span>{student.id}</span><span>·</span><span>{student.classLabel}</span><span>·</span><span>Joined {student.joined}</span>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <RiskBadge level={student.risk} />
              <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "var(--radius-full)", background: "var(--neutral-100)", color: "var(--neutral-600)", fontSize: 11, fontWeight: 600 }}>{student.fee}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Phone size={14} /> Call parent
          </button>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <MessageCircle size={14} /> WhatsApp
          </button>
        </div>
      </div>

      {/* Two-column content */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 16 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Attendance trend */}
          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Attendance trend</div>
              <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>Last 12 weeks</div>
            </div>
            <AreaChart values={trend} fill="#FEE2E2" color="#DC2626" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--neutral-500)", marginTop: 8 }}>
              <span>12w ago</span><span>This week · {student.attendance}%</span>
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 14 }}>Recent activity</div>
            {activity.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < activity.length - 1 ? "1px solid var(--neutral-100)" : "none" }}>
                <row.Icon size={16} color={row.tone} />
                <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)" }}>{row.text}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{row.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* AI suggestion */}
          <div style={{ background: "var(--primary-50)", border: "1px solid var(--primary-100)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--primary-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13 }}>R</div>
            <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }}>Suggested next step</strong>
              <div style={{ marginTop: 6 }}>Saanvi&apos;s attendance dropped 40% in two weeks. A short call to her parents this week tends to recover students at this stage. Most respond within 48 hours.</div>
              <span style={{ display: "block", fontSize: 12, color: "var(--neutral-500)", marginTop: 6 }}>Based on 312 similar cases · Last 6 months</span>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer" }}>Approve nudge</button>
                <button style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--neutral-700)", cursor: "pointer" }}>Snooze</button>
              </div>
            </div>
          </div>

          {/* Personal info */}
          <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Personal info</div>
              <MoreHorizontal size={16} color="var(--neutral-400)" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {infoRows.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                  <r.Icon size={14} color="var(--neutral-400)" />
                  <span style={{ color: "var(--neutral-500)", width: 80, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ color: "var(--neutral-800)", fontWeight: 500 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

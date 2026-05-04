import { redirect } from "next/navigation";
import { Building2, Globe2, CreditCard, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const rows = [
    { Icon: Building2, label: "Academy name", value: dbUser.academy.name },
    { Icon: Globe2, label: "Country", value: dbUser.academy.country },
    { Icon: CreditCard, label: "Currency", value: dbUser.academy.currency },
    { Icon: UserRound, label: "Owner email", value: user.email ?? "Unknown" },
  ];

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Workspace preferences</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Settings</h1>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden", maxWidth: 760 }}>
        <div style={{ padding: 20, borderBottom: "1px solid var(--neutral-100)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--neutral-900)" }}>Academy profile</div>
          <div style={{ fontSize: 13, color: "var(--neutral-500)", marginTop: 4 }}>These values come from onboarding and scope the dashboard data.</div>
        </div>

        {rows.map((row) => (
          <div key={row.label} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--neutral-100)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--neutral-500)", fontSize: 13, fontWeight: 600 }}>
              <row.Icon size={16} />
              {row.label}
            </div>
            <div style={{ color: "var(--neutral-900)", fontSize: 14, fontWeight: 600 }}>{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

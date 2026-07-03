import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getTutorStats } from "@/lib/tutors/tutors";
import { getCurrencySymbol } from "@/lib/currency";
import { TutorsBulkTable } from "@/components/dashboard/TutorsBulkTable";

export default async function TutorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser.academy) redirect("/onboarding");

  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);
  // Header count only; the table fetches its own paginated pages from /api/tutors.
  const tutors = await getTutorStats(dbUser.academy.id, sb);

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Tutor risk overview - {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Tutors</h1>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--neutral-500)" }}>
          {tutors.length} tutor{tutors.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        <TutorsBulkTable currencySymbol={currencySymbol} />
      </div>
    </div>
  );
}

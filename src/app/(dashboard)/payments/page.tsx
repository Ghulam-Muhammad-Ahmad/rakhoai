import Link from "next/link";
import { Upload } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getUserDb } from "@/lib/db/user-client";
import { getCurrencySymbol } from "@/lib/currency";
import { PaymentsBulkTable } from "@/components/dashboard/PaymentsBulkTable";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser.academy) redirect("/onboarding");

  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);

  // Cheap probe to detect a missing Payment table (migration not applied); the
  // table fetches its own paginated/filtered pages from /api/payments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any)
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("academyId", dbUser.academy.id) as { error: { message: string } | null };

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Payment history - {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Payments</h1>
        </div>
        <Link href="/uploads/new" style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Upload size={14} /> Import payments
        </Link>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        {error ? (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "#92400E", background: "#FFFBEB" }}>
            Payments table is not available yet. Apply the structured import migration, then import payments.
          </div>
        ) : (
          <PaymentsBulkTable currencySymbol={currencySymbol} />
        )}
      </div>
    </div>
  );
}

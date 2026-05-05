import Link from "next/link";
import { Upload } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { db } from "@/lib/db/client";
import { SessionsBulkTable, type SessionTableRow } from "@/components/dashboard/SessionsBulkTable";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function SessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) redirect("/onboarding");

  const query = first(params.q).toLowerCase();
  const statusFilter = first(params.status).toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("Session")
    .select(`
      id,
      sessionDate,
      attendanceStatus,
      teacherName,
      subject,
      createdAt,
      student:Student(id, name, externalId)
    `)
    .eq("academyId", dbUser.academy.id)
    .order("sessionDate", { ascending: false, nullsFirst: false })
    .limit(300) as { data: SessionTableRow[] | null; error: { message: string } | null };

  const rows = (data ?? []).filter((row) => {
    const haystack = `${row.student?.name ?? ""} ${row.student?.externalId ?? ""} ${row.teacherName ?? ""} ${row.subject ?? ""} ${row.attendanceStatus ?? ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = !statusFilter || String(row.attendanceStatus ?? "").toLowerCase().includes(statusFilter);
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>Attendance history - {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Sessions</h1>
        </div>
        <Link href="/uploads/new" style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Upload size={14} /> Import sessions
        </Link>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        <form style={{ display: "flex", gap: 10, padding: 16, borderBottom: "1px solid var(--neutral-100)", background: "#fff" }}>
          <input name="q" defaultValue={first(params.q)} placeholder="Search student, ID, teacher, subject" style={{ flex: 1, minWidth: 240, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--neutral-200)", fontSize: 13, outline: "none" }} />
          <select name="status" defaultValue={first(params.status)} style={{ width: 170, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--neutral-200)", fontSize: 13, background: "#fff", color: "var(--neutral-700)" }}>
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
          <button style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "var(--primary-500)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Filter</button>
        </form>

        {error ? (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "#92400E", background: "#FFFBEB" }}>
            Sessions table is not available yet. Apply the structured import migration, then import sessions.
          </div>
        ) : (
          <SessionsBulkTable rows={rows} />
        )}
      </div>
    </div>
  );
}

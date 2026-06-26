import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getStudentRiskList } from "@/lib/students/risk";
import { getUserDb } from "@/lib/db/user-client";
import { getCurrencySymbol } from "@/lib/currency";

const TERMINAL = new Set(["DONE", "STUDENT_SAVED", "STUDENT_LOST"]);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser?.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const academyId = dbUser.academy.id;
  const currencySymbol = getCurrencySymbol(dbUser.academy.currency);

  const [students, actionsResult] = await Promise.all([
    getStudentRiskList(academyId, {}, currencySymbol, sb),
    sb
      .from("Action")
      .select(`id, type, content, status, notes, createdAt, studentId, Student(name)`)
      .eq("academyId", academyId)
      .in("status", ["IN_PROGRESS", "DONE", "STUDENT_SAVED", "STUDENT_LOST"])
      .order("createdAt", { ascending: false })
      .limit(20),
  ]);

  const pending = students
    .filter(
      (s) =>
        (s.riskBand === "HIGH" || s.riskBand === "MEDIUM") &&
        (!s.latestActionStatus || !TERMINAL.has(s.latestActionStatus))
    )
    .map((s) => ({
      studentId: s.id,
      name: s.name,
      initials: s.initials,
      riskBand: s.riskBand,
      recommendedAction: s.recommendedAction ?? "Check-in",
      reasons: s.reasons,
      computedAt: s.computedAt,
    }));

  type ActionWithStudent = {
    id: string;
    type: string;
    content: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
    studentId: string;
    Student: { name: string } | null;
  };

  const sent = ((actionsResult.data ?? []) as unknown as ActionWithStudent[]).map((a) => ({
    id: a.id,
    type: a.type,
    content: a.content,
    status: a.status,
    notes: a.notes,
    createdAt: a.createdAt,
    studentId: a.studentId,
    studentName: a.Student?.name ?? "Unknown",
  }));

  return NextResponse.json({ pending, sent });
}

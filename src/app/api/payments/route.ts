import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { getUserDb } from "@/lib/db/user-client";
import { deletePaymentsForAcademy } from "@/lib/deletions/bulk-delete";
import { normalizeDeleteIds } from "@/lib/deletions/bulk-delete-core";
import { parsePageParams } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";

const PAYMENT_SORT: Record<string, string> = {
  date: "paymentDate",
  amount: "amount",
  status: "paymentStatus",
  overdue: "overdueAmount",
  method: "method",
};

function parseSort(sp: URLSearchParams, map: Record<string, string>, fallback: string) {
  const column = map[sp.get("sort") ?? ""] ?? fallback;
  const ascending = sp.get("direction") === "asc";
  return { column, ascending };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const { from, to } = parsePageParams(searchParams);
  const q = (searchParams.get("q") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const { column, ascending } = parseSort(searchParams, PAYMENT_SORT, "paymentDate");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb as any)
    .from("Payment")
    .select(
      `id, paymentDate, amount, paymentStatus, overdueAmount, method, createdAt,
       student:Student(id, name, externalId)`,
      { count: "exact" }
    )
    .eq("academyId", dbUser.academy.id);

  if (status) query = query.ilike("paymentStatus", `%${status}%`);

  if (q) {
    // Two-step search: resolve students whose name matches, then match parent
    // columns OR those student ids (embedded-relation filtering inside or() is
    // unreliable in PostgREST).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studs } = await (sb as any)
      .from("Student").select("id").eq("academyId", dbUser.academy.id)
      .ilike("name", `%${q}%`).limit(1000);
    const ids = ((studs ?? []) as { id: string }[]).map((s) => s.id);
    const safe = q.replace(/[,*()".:\\]/g, " ").trim();
    const parts: string[] = [];
    if (safe) parts.push(`method.ilike.*${safe}*`);
    if (ids.length) parts.push(`studentId.in.(${ids.join(",")})`);
    query = parts.length ? query.or(parts.join(",")) : query.in("id", []);
  }

  query = query.order(column, { ascending, nullsFirst: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rows: data ?? [], total: count ?? 0 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const dbUser = await getAuthUserWithAcademy(user.id, sb);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const ids = normalizeDeleteIds(body?.ids);
  if (ids.length === 0) return NextResponse.json({ error: "At least one payment id is required" }, { status: 400 });

  try {
    const result = await deletePaymentsForAcademy(dbUser.academy.id, ids, sb);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete payments";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

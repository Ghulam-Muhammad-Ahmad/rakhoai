import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";

const TYPES = ["feedback", "feature", "bug"] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const academyId = await getAcademyIdForSupabaseUser(user.id, sb);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const type = TYPES.includes(body?.type) ? body.type : "feedback";
  const text = typeof body?.body === "string" ? body.body.trim() : null;

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (title.length > 200) return NextResponse.json({ error: "title too long" }, { status: 400 });

  // id/userId filled by DB defaults (gen_random_uuid / auth.uid)
  const { error } = await sb.from("Feedback").insert({ academyId, type, title, body: text });
  if (error) return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ academy: null }, { status: 401 });
  }

  const { data: dbUser } = await db
    .from("User")
    .select("id, academy:Academy(*)")
    .eq("supabaseId", user.id)
    .maybeSingle() as { data: { id: string; academy: Record<string, unknown> | null } | null };

  return NextResponse.json({ academy: dbUser?.academy ?? null });
}

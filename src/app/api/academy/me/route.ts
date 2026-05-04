import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ academy: null }, { status: 401 });
  }

  try {
    const dbUser = await getAuthUserWithAcademy(user.id);
    return NextResponse.json({ academy: dbUser?.academy ?? null });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

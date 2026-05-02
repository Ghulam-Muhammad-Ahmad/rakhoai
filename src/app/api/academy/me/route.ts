import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ academy: null }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { academy: true },
  });

  return NextResponse.json({ academy: dbUser?.academy ?? null });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { getDashboardSummary } from "@/lib/dashboard/summary";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { academy: true },
  });

  if (!dbUser?.academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  return NextResponse.json(await getDashboardSummary(dbUser.academy.id));
}

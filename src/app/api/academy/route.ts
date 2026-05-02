import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  currency: z.string().min(1).default("USD"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, country, currency } = parsed.data;

  const dbUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    update: {},
    create: {
      supabaseId: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    },
  });

  const existing = await prisma.academy.findUnique({ where: { ownerId: dbUser.id } });
  if (existing) {
    const academy = await prisma.academy.update({
      where: { id: existing.id },
      data: { name, country, currency },
    });

    return NextResponse.json({ academy });
  }

  const academy = await prisma.academy.create({
    data: { ownerId: dbUser.id, name, country, currency },
  });

  return NextResponse.json({ academy }, { status: 201 });
}

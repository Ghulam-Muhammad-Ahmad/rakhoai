import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import crypto from "node:crypto";

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

  // Find or create User record
  const { data: existingUser } = await db
    .from("User")
    .select("id")
    .eq("supabaseId", user.id)
    .maybeSingle();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const newId = crypto.randomUUID();
    const { error } = await db.from("User").insert({
      id: newId,
      supabaseId: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    });
    if (error) return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    userId = newId;
  }

  // Find or upsert Academy
  const { data: existingAcademy } = await db
    .from("Academy")
    .select("id")
    .eq("ownerId", userId)
    .maybeSingle();

  if (existingAcademy) {
    const { data: academy, error } = await db
      .from("Academy")
      .update({ name, country, currency })
      .eq("id", existingAcademy.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Failed to update academy" }, { status: 500 });
    return NextResponse.json({ academy });
  }

  const { data: academy, error } = await db.from("Academy").insert({
    id: crypto.randomUUID(),
    ownerId: userId,
    name,
    country,
    currency,
  }).select().single();

  if (error) return NextResponse.json({ error: "Failed to create academy" }, { status: 500 });
  return NextResponse.json({ academy }, { status: 201 });
}

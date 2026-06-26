import crypto from "node:crypto";
import { adminDb } from "@/lib/db/client";
import type { Database } from "@/lib/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildActionStatusUpdate, isActionStatus, type ActionStatus } from "./action-core";

type ActionRow = Database["public"]["Tables"]["Action"]["Row"];

export async function assertStudentBelongsToAcademy(
  studentId: string,
  academyId: string,
  client?: SupabaseClient<Database>
) {
  const db = client ?? adminDb;
  const { data, error } = await db
    .from("Student")
    .select("id")
    .eq("id", studentId)
    .eq("academyId", academyId)
    .maybeSingle();

  if (error) throw new Error(`Failed to verify student ownership`);
  if (!data) throw new Error("Student not found");
}

export async function createAction(args: {
  academyId: string;
  studentId: string;
  takenBy: string;
  type: string;
  content?: string | null;
  status?: ActionStatus;
  notes?: string | null;
}, client?: SupabaseClient<Database>): Promise<ActionRow> {
  const db = client ?? adminDb;
  if (args.status && !isActionStatus(args.status)) throw new Error("Invalid action status");
  await assertStudentBelongsToAcademy(args.studentId, args.academyId, client);

  const now = new Date().toISOString();
  const status = args.status ?? "PENDING";
  const { data, error } = await db
    .from("Action")
    .insert({
      id: crypto.randomUUID(),
      academyId: args.academyId,
      studentId: args.studentId,
      takenBy: args.takenBy,
      type: args.type,
      content: args.content ?? null,
      status,
      notes: args.notes ?? null,
      takenAt: status === "DONE" || status === "STUDENT_SAVED" || status === "STUDENT_LOST" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create action`);
  return data;
}

export async function updateActionStatus(args: {
  academyId: string;
  actionId: string;
  status: ActionStatus;
  notes?: string | null;
  type?: string | null;
  content?: string | null;
}, client?: SupabaseClient<Database>): Promise<ActionRow> {
  const db = client ?? adminDb;
  if (!isActionStatus(args.status)) throw new Error("Invalid action status");

  const { data: existing, error: fetchError } = await db
    .from("Action")
    .select("id, academyId")
    .eq("id", args.actionId)
    .eq("academyId", args.academyId)
    .maybeSingle();

  if (fetchError) throw new Error(`Failed to fetch action`);
  if (!existing) throw new Error("Action not found");

  const update = buildActionStatusUpdate({ status: args.status, notes: args.notes });
  const payload = {
    ...update,
    ...(typeof args.type === "string" ? { type: args.type } : {}),
    ...(typeof args.content === "string" ? { content: args.content } : {}),
  };
  const { data, error } = await db
    .from("Action")
    .update(payload)
    .eq("id", args.actionId)
    .eq("academyId", args.academyId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update action`);
  return data;
}

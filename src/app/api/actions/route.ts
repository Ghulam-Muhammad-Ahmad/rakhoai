import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { createAction } from "@/lib/actions/actions";
import { isActionStatus } from "@/lib/actions/action-core";
import { deleteActionsForAcademy } from "@/lib/deletions/bulk-delete";
import { normalizeDeleteIds } from "@/lib/deletions/bulk-delete-core";

function revalidateActionPaths(studentId?: string | null) {
  if (studentId) revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/interventions");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.studentId !== "string" || typeof body.type !== "string") {
    return NextResponse.json({ error: "studentId and type are required" }, { status: 400 });
  }

  if (body.status && !isActionStatus(body.status)) {
    return NextResponse.json({ error: "Invalid action status" }, { status: 400 });
  }

  try {
    const action = await createAction({
      academyId: dbUser.academy.id,
      studentId: body.studentId,
      takenBy: user.id,
      type: body.type,
      content: typeof body.content === "string" ? body.content : null,
      status: body.status,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    revalidateActionPaths(action.studentId);
    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create action";
    return NextResponse.json({ error: message }, { status: message === "Student not found" ? 404 : 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const ids = normalizeDeleteIds(body?.ids);
  if (ids.length === 0) {
    return NextResponse.json({ error: "At least one intervention id is required" }, { status: 400 });
  }

  try {
    const result = await deleteActionsForAcademy(dbUser.academy.id, ids);
    revalidateActionPaths();
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete interventions";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

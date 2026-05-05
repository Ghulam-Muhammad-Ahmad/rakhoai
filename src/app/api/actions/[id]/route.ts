import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { updateActionStatus } from "@/lib/actions/actions";
import { isActionStatus } from "@/lib/actions/action-core";
import { deleteActionsForAcademy } from "@/lib/deletions/bulk-delete";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
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
  if (!body || !isActionStatus(body.status)) {
    return NextResponse.json({ error: "Invalid action status" }, { status: 400 });
  }

  try {
    const action = await updateActionStatus({
      academyId: dbUser.academy.id,
      actionId: id,
      status: body.status,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return NextResponse.json({ action });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update action";
    return NextResponse.json({ error: message }, { status: message === "Action not found" ? 404 : 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
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

  try {
    const result = await deleteActionsForAcademy(dbUser.academy.id, [id]);
    if (result.deleted === 0) return NextResponse.json({ error: "Action not found" }, { status: 404 });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete action";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

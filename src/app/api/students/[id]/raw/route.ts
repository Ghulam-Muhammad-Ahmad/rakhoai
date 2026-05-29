import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { db } from "@/lib/db/client";

type Params = { params: Promise<{ id: string }> };

// Normalizer-internal keys that aren't part of the user's original file.
const HIDDEN_KEYS = new Set(["sourceStudentId", "sourceUploadId", "structuredSignals", "rowIndex"]);

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Returns the raw uploaded columns that were NOT mapped to a schema field —
// i.e. the leftover data we kept but don't surface anywhere else. Lazy-loaded
// by the student-detail popup so it only runs when the user opens it.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getAuthUserWithAcademy(user.id);
  if (!dbUser.academy) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: student } = await (db as any)
    .from("Student")
    .select("rawDataJson, uploadId")
    .eq("academyId", dbUser.academy.id)
    .eq("id", id)
    .maybeSingle();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // Columns that were mapped to an internal field (so NOT "unmapped").
  let mappedColumns = new Set<string>();
  if (student.uploadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: upload } = await (db as any)
      .from("Upload")
      .select("mappingJson")
      .eq("id", student.uploadId)
      .maybeSingle();
    const mappings = (upload?.mappingJson ?? []) as { sourceColumn: string; suggestedField: string | null }[];
    mappedColumns = new Set(mappings.filter((m) => m.suggestedField).map((m) => m.sourceColumn));
  }

  const raw = student.rawDataJson && typeof student.rawDataJson === "object" && !Array.isArray(student.rawDataJson)
    ? (student.rawDataJson as Record<string, unknown>)
    : {};

  const fields = Object.entries(raw)
    .filter(([key]) => !HIDDEN_KEYS.has(key) && !mappedColumns.has(key))
    .map(([key, value]) => ({ key, value: formatValue(value) }));

  return NextResponse.json({ fields });
}

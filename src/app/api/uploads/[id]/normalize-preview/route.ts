import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserDb } from "@/lib/db/user-client";
import { getAcademyIdForSupabaseUser } from "@/lib/db/auth-user";
import { MappingResult } from "@/lib/matching";
import { normalizeRows } from "@/lib/scoring/normalize";
import type { EntityType, ExistingStudentForMatch, IdentifierSelection } from "@/lib/imports/types";
import { matchStudentForImportRow } from "@/lib/imports/review";

type Params = { params: Promise<{ id: string }> };

function sourceByField(mappings: MappingResult[]) {
  return new Map(
    mappings
      .filter((mapping) => mapping.suggestedField)
      .map((mapping) => [mapping.suggestedField as string, mapping.sourceColumn])
  );
}

function valueFor(row: Record<string, unknown>, sources: Map<string, string>, field: string) {
  const source = sources.get(field);
  return source ? row[source] : null;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = await getUserDb();
  const academyId = await getAcademyIdForSupabaseUser(user.id, sb);
  if (!academyId) return NextResponse.json({ error: "Academy not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upload } = await (sb as any)
    .from("Upload")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!upload || upload.academyId !== academyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows =
    (upload.rawRowsJson as Record<string, unknown>[] | null) ??
    (upload.sampleRows as Record<string, unknown>[] | null) ??
    [];
  const mappings = (upload.mappingJson as MappingResult[] | null) ?? [];
  const entityType = (upload.entityType ?? "students") as EntityType;

  if (entityType !== "students") {
    let review = {
      totalRows: rows.length,
      readyRows: rows.length,
      duplicateRows: 0,
      updatedRows: 0,
      newRows: rows.length,
      unmatchedRows: 0,
      lowConfidenceRows: 0,
      ignoredRows: 0,
    };

    if (entityType === "sessions" || entityType === "payments") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: students } = await (sb as any)
        .from("Student")
        .select("id, externalId, name, contact")
        .eq("academyId", academyId) as { data: ExistingStudentForMatch[] | null };
      const identifier = upload.identifierJson as IdentifierSelection | null;
      if (!identifier) return NextResponse.json({ error: "Choose a Student Identifier first" }, { status: 400 });
      let readyRows = 0;
      let unmatchedRows = 0;
      let lowConfidenceRows = 0;
      for (const row of rows) {
        const match = matchStudentForImportRow(row, students ?? [], identifier);
        if (match.status === "unmatched") unmatchedRows++;
        else if (match.status === "needs_review" || match.confidence === "low") lowConfidenceRows++;
        else readyRows++;
      }
      review = {
        ...review,
        readyRows,
        newRows: readyRows,
        unmatchedRows,
        lowConfidenceRows,
        ignoredRows: unmatchedRows + lowConfidenceRows,
      };
    }

    return NextResponse.json({
      entityType,
      rowCount: review.readyRows,
      summaries: [],
      review,
      message: entityType === "teachers"
        ? "Teacher rows are ready to import."
        : "Rows with unmatched or low-confidence student links must be reviewed before import.",
    });
  }

  const { students, summaries } = await normalizeRows(rows, mappings, { academyId, uploadId: id });
  const sources = sourceByField(mappings);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingStudents } = await (sb as any)
    .from("Student")
    .select("id, externalId, name, contact")
    .eq("academyId", academyId) as { data: ExistingStudentForMatch[] | null };
  const byExternal = new Set((existingStudents ?? []).map((student) => student.externalId?.toLowerCase()).filter(Boolean));
  const byContact = new Set((existingStudents ?? []).map((student) => student.contact?.toLowerCase()).filter(Boolean));
  const byName = new Set((existingStudents ?? []).map((student) => student.name.toLowerCase()));

  let updatedRows = 0;
  let newRows = 0;
  for (const student of students) {
    const exists =
      (student.externalId && byExternal.has(student.externalId.toLowerCase())) ||
      (student.contact && byContact.has(student.contact.toLowerCase())) ||
      byName.has(student.name.toLowerCase());
    if (exists) updatedRows++;
    else newRows++;
  }

  const missingNames = rows.filter((row) => !String(valueFor(row, sources, "student_name") ?? "").trim()).length;
  const hasIdentifierMapping = sources.has("student_identifier") || sources.has("email") || sources.has("phone");
  const missingIdentifiers = hasIdentifierMapping
    ? rows.filter((row) => {
        const identifierValue =
          valueFor(row, sources, "student_identifier") ??
          valueFor(row, sources, "email") ??
          valueFor(row, sources, "phone");
        return !String(identifierValue ?? "").trim();
      }).length
    : rows.length;
  const review = {
    totalRows: rows.length,
    readyRows: students.length,
    duplicateRows: updatedRows,
    updatedRows,
    newRows,
    unmatchedRows: 0,
    lowConfidenceRows: 0,
    missingNames,
    missingIdentifiers,
    ignoredRows: rows.length - students.length,
  };

  return NextResponse.json({ entityType, rowCount: students.length, summaries, review });
}

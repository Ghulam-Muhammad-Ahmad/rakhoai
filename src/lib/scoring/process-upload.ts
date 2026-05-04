import { db } from "@/lib/db/client";
import type { Database } from "@/lib/db/database.types";
import { MappingResult } from "@/lib/matching";
import { normalizeRows } from "./normalize";
import { scoreStudentsWithAi } from "./ai";
import { persistRiskResults } from "./persist";

type UploadRow = Database["public"]["Tables"]["Upload"]["Row"];

export async function processMappedUpload(uploadId: string, academyId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upload, error } = await (db as any)
    .from("Upload")
    .select("*")
    .eq("id", uploadId)
    .single() as { data: UploadRow | null; error: { message: string } | null };

  if (error || !upload || upload.academyId !== academyId) throw new Error("Upload not found");
  if (upload.status === "PROCESSED") {
    return { processed: upload.rowCount ?? 0, scored: upload.rowCount ?? 0, skipped: true };
  }
  if (upload.status !== "MAPPED") throw new Error("Upload must be mapped before processing");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: processingError } = await (db as any)
    .from("Upload")
    .update({ status: "PROCESSING" })
    .eq("id", uploadId) as { error: { message: string } | null };
  if (processingError) throw new Error(`Failed to set upload to PROCESSING: ${processingError.message}`);

  try {
    const rows =
      (upload.rawRowsJson as Record<string, unknown>[] | null) ??
      (upload.sampleRows as Record<string, unknown>[] | null) ??
      [];
    const mappings = (upload.mappingJson as MappingResult[] | null) ?? [];
    const students = normalizeRows(rows, mappings);
    const model = process.env.OPENAI_RISK_MODEL ?? "gpt-4o-mini";
    const results = await scoreStudentsWithAi({ academyId, uploadId, students });

    await persistRiskResults({ academyId, uploadId, students, results, model });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("Upload").update({
      status: "PROCESSED",
      processedAt: new Date().toISOString(),
      rowCount: students.length,
    }).eq("id", uploadId);

    return { processed: students.length, scored: results.length };
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("Upload").update({ status: "FAILED" }).eq("id", uploadId);
    throw err;
  }
}

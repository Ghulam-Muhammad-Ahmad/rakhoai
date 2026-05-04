import { db } from "@/lib/db/client";
import type { UploadRow } from "@/lib/db/types";
import { MappingResult } from "@/lib/matching";
import { normalizeRows } from "./normalize";
import { scoreStudentsWithAi } from "./ai";
import { persistRiskResults } from "./persist";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyDb = db as any;

export async function processMappedUpload(uploadId: string, academyId: string) {
  const { data: upload, error } = await anyDb
    .from("Upload")
    .select("*")
    .eq("id", uploadId)
    .single() as { data: UploadRow | null; error: { message: string } | null };

  if (error || !upload || upload.academyId !== academyId) throw new Error("Upload not found");
  if (upload.status !== "MAPPED") throw new Error("Upload must be mapped before processing");

  await anyDb.from("Upload").update({ status: "PROCESSING" }).eq("id", uploadId);

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
    await anyDb.from("Upload").update({
      status: "PROCESSED",
      processedAt: new Date().toISOString(),
      rowCount: students.length,
    }).eq("id", uploadId);

    return { processed: students.length, scored: results.length };
  } catch (err) {
    await anyDb.from("Upload").update({ status: "FAILED" }).eq("id", uploadId);
    throw err;
  }
}

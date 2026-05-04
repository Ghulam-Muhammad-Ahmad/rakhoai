import { prisma } from "@/lib/db/prisma";
import { MappingResult } from "@/lib/matching";
import { normalizeRows } from "./normalize";
import { scoreStudentsWithAi } from "./ai";
import { persistRiskResults } from "./persist";

export async function processMappedUpload(uploadId: string, academyId: string) {
  const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
  if (!upload || upload.academyId !== academyId) throw new Error("Upload not found");
  if (upload.status !== "MAPPED") throw new Error("Upload must be mapped before processing");

  await prisma.upload.update({ where: { id: uploadId }, data: { status: "PROCESSING" } });

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
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: "PROCESSED", processedAt: new Date(), rowCount: students.length },
    });

    return { processed: students.length, scored: results.length };
  } catch (error) {
    await prisma.upload.update({ where: { id: uploadId }, data: { status: "FAILED" } });
    throw error;
  }
}

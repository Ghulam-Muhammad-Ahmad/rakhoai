import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { CanonicalStudentInput, AiRiskResult } from "./types";
import { computeRuleScore } from "./rules";

function getStudentResultKey(student: CanonicalStudentInput): string {
  return student.contact ?? student.externalId ?? student.name;
}

async function findExistingStudent(academyId: string, student: CanonicalStudentInput) {
  if (student.contact) {
    const byContact = await prisma.student.findFirst({
      where: { academyId, contact: student.contact },
      orderBy: { updatedAt: "desc" },
    });
    if (byContact) return byContact;
  }

  if (student.externalId) {
    const byExternalId = await prisma.student.findFirst({
      where: { academyId, externalId: student.externalId },
      orderBy: { updatedAt: "desc" },
    });
    if (byExternalId) return byExternalId;
  }

  return prisma.student.findFirst({
    where: { academyId, name: student.name },
    orderBy: { updatedAt: "desc" },
  });
}

export async function persistRiskResults(args: {
  academyId: string;
  uploadId: string;
  students: CanonicalStudentInput[];
  results: AiRiskResult[];
  model: string;
}) {
  const resultByKey = new Map(args.results.map((result) => [result.studentKey, result]));

  for (const student of args.students) {
    const key = getStudentResultKey(student);
    const result = resultByKey.get(key);
    if (!result) continue;

    const data = {
      academyId: args.academyId,
      uploadId: args.uploadId,
      externalId: student.externalId,
      name: student.name,
      contact: student.contact,
      joinDate: student.joinDate,
      lastSessionDate: student.lastSessionDate,
      attendanceRate: student.attendanceRate,
      paymentStatus: student.paymentStatus,
      lastPaymentDate: student.lastPaymentDate,
      totalSessions: student.totalSessions,
      feesAmount: student.feesAmount,
      subject: student.subject,
      tutor: student.tutor,
      rawDataJson: student.rawData as Prisma.InputJsonValue,
    };

    const existing = await findExistingStudent(args.academyId, student);
    const dbStudent = existing
      ? await prisma.student.update({ where: { id: existing.id }, data })
      : await prisma.student.create({ data });

    await prisma.riskAssessment.create({
      data: {
        studentId: dbStudent.id,
        uploadId: args.uploadId,
        riskScore: result.riskScore,
        riskBand: result.riskBand,
        reasonsJson: result.reasons,
        recommendedAction: result.recommendedAction,
        confidence: result.confidence,
        ruleScore: computeRuleScore(student).score,
        aiModel: args.model,
      },
    });
  }
}

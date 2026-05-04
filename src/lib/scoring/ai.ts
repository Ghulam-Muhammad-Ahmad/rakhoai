import { Redis } from "@upstash/redis";
import { createLoggedChatCompletion } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage-log";
import { CanonicalStudentInput, AiRiskResult } from "./types";
import { computeRuleScore, getRiskBand } from "./rules";

type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts: { ex: number }) => Promise<void>;
};

let redis: RedisLike | null | undefined;

async function getRedis(): Promise<RedisLike | null> {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return redis;
  }

  const client = new Redis({ url, token });
  redis = {
    get: (key) => client.get<string>(key),
    set: async (key, value, opts) => {
      await client.set(key, value, { ex: opts.ex });
    },
  };
  return redis;
}

function studentKey(student: CanonicalStudentInput, fallback: string): string {
  return student.contact ?? student.externalId ?? fallback;
}

function cacheKey(uploadId: string, key: string): string {
  return `risk:${uploadId}:${key}`;
}

function fallbackResult(student: CanonicalStudentInput, key: string): AiRiskResult {
  const rule = computeRuleScore(student);
  const riskScore = Math.max(0, Math.min(100, rule.score));
  return {
    studentKey: key,
    riskScore,
    riskBand: getRiskBand(riskScore),
    reasons: rule.reasons.slice(0, 3),
    recommendedAction:
      riskScore >= 70
        ? "Call the guardian and offer a short recovery plan for this week."
        : riskScore >= 40
          ? "Send a personalized check-in and ask whether schedule or payment support is needed."
          : "Monitor after the next upload.",
    confidence: 0.55,
  };
}

export async function scoreStudentsWithAi(args: {
  academyId: string;
  uploadId: string;
  students: CanonicalStudentInput[];
}): Promise<AiRiskResult[]> {
  const model = process.env.OPENAI_RISK_MODEL ?? "gpt-4o-mini";
  const cache = await getRedis();
  const output: AiRiskResult[] = [];
  const misses: Array<{ student: CanonicalStudentInput; key: string }> = [];

  for (let index = 0; index < args.students.length; index += 1) {
    const student = args.students[index];
    const key = studentKey(student, `${student.name}-${index}`);
    const cached = cache ? await cache.get(cacheKey(args.uploadId, key)) : null;

    if (cached) {
      const started = Date.now();
      await logAiUsage({
        academyId: args.academyId,
        uploadId: args.uploadId,
        feature: "risk_scoring",
        model,
        payloadForHash: { cacheKey: cacheKey(args.uploadId, key) },
        cacheHit: true,
        status: "cache_hit",
        latencyMs: Date.now() - started,
      });
      output.push(JSON.parse(cached) as AiRiskResult);
    } else {
      misses.push({ student, key });
    }
  }

  for (let i = 0; i < misses.length; i += 15) {
    const batch = misses.slice(i, i + 15);
    const payload = batch.map(({ student, key }) => {
      const rule = computeRuleScore(student);
      return {
        studentKey: key,
        name: student.name,
        lastSessionDate: student.lastSessionDate?.toISOString() ?? null,
        attendanceRate: student.attendanceRate,
        paymentStatus: student.paymentStatus,
        lastPaymentDate: student.lastPaymentDate?.toISOString() ?? null,
        totalSessions: student.totalSessions,
        feesAmount: student.feesAmount,
        subject: student.subject,
        tutor: student.tutor,
        ruleScore: rule.score,
        ruleReasons: rule.reasons,
      };
    });

    let parsed: {
      students: Array<{
        studentKey: string;
        riskScore: number;
        reasons: string[];
        recommendedAction: string;
        confidence: number;
      }>;
    };

    try {
      const response = await createLoggedChatCompletion({
        academyId: args.academyId,
        uploadId: args.uploadId,
        feature: "risk_scoring",
        model,
        payloadForHash: payload,
        request: {
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Score tutoring students for churn risk. Return JSON { "students": [{ "studentKey": string, "riskScore": 0-100, "reasons": string[], "recommendedAction": string, "confidence": 0-1 }] }. Use concise reasons and practical owner actions.',
            },
            { role: "user", content: JSON.stringify({ students: payload }) },
          ],
        },
      });

      parsed = JSON.parse(response.choices[0].message.content ?? '{"students":[]}');
    } catch {
      parsed = { students: batch.map(({ student, key }) => fallbackResult(student, key)) };
    }

    const byKey = new Map(parsed.students.map((student) => [student.studentKey, student]));

    for (const { student, key } of batch) {
      const ai = byKey.get(key) ?? fallbackResult(student, key);
      const riskScore = Math.max(0, Math.min(100, Math.round(ai.riskScore)));
      const result: AiRiskResult = {
        studentKey: key,
        riskScore,
        riskBand: getRiskBand(riskScore),
        reasons: (ai.reasons ?? []).slice(0, 3),
        recommendedAction: ai.recommendedAction,
        confidence: Math.max(0, Math.min(1, ai.confidence ?? 0.5)),
      };
      output.push(result);
      if (cache) {
        await cache.set(cacheKey(args.uploadId, key), JSON.stringify(result), { ex: 86_400 });
      }
    }
  }

  return output;
}

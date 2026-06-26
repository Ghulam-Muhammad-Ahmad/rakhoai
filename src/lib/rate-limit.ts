import { Redis } from "@upstash/redis";

const redis = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
})();

function key(identifier: string, window: string): string {
  return `ratelimit:${identifier}:${window}`;
}

export async function checkRateLimit(opts: {
  identifier: string;
  windowSeconds: number;
  maxRequests: number;
}): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (!redis) {
    // Rate limiting disabled when Redis is not configured
    return { success: true, limit: opts.maxRequests, remaining: opts.maxRequests, reset: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / opts.windowSeconds) * opts.windowSeconds;
  const k = key(opts.identifier, `${windowStart}`);

  const current = await redis.incr(k);
  if (current === 1) {
    await redis.expire(k, opts.windowSeconds);
  }

  const remaining = Math.max(0, opts.maxRequests - current);
  const reset = windowStart + opts.windowSeconds;
  return {
    success: current <= opts.maxRequests,
    limit: opts.maxRequests,
    remaining,
    reset,
  };
}

/** Per-academy rate limit for expensive AI operations */
export async function checkAiRateLimit(academyId: string): Promise<{ success: boolean }> {
  const result = await checkRateLimit({
    identifier: `ai:${academyId}`,
    windowSeconds: 3600, // 1 hour
    maxRequests: 20,
  });
  return { success: result.success };
}

/** Per-IP rate limit for auth endpoints */
export async function checkAuthRateLimit(ip: string): Promise<{ success: boolean }> {
  const result = await checkRateLimit({
    identifier: `auth:${ip}`,
    windowSeconds: 300, // 5 minutes
    maxRequests: 10,
  });
  return { success: result.success };
}

// Naive in-memory rate limiter for demo/dev. Replace with Redis/Upstash in production.
const buckets = new Map<string, { tokens: number; updatedAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: 0, updatedAt: now };
  // reset window
  if (now - bucket.updatedAt > windowMs) {
    bucket.tokens = 0;
    bucket.updatedAt = now;
  }
  if (bucket.tokens >= limit) return false;
  bucket.tokens += 1;
  buckets.set(key, bucket);
  return true;
}

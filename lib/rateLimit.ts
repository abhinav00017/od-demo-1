/**
 * Fixed-window rate limit kept in memory. Good enough for a demo on one server.
 * Each serverless instance keeps its own counts, so the real limit on Vercel is looser.
 */
type Hit = { count: number; resetAt: number };
const g = globalThis as typeof globalThis & { __rateLimits?: Map<string, Hit> };

function hits() {
  g.__rateLimits ??= new Map();
  return g.__rateLimits;
}

/** Returns true when the call is allowed, false when `key` used up its `limit` in this window. */
export function rateLimit(key: string, { limit = 10, windowMs = 60_000, now = Date.now() } = {}) {
  const map = hits();
  if (map.size > 5000) for (const [k, v] of map) if (v.resetAt <= now) map.delete(k);
  const hit = map.get(key);
  if (!hit || hit.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  hit.count += 1;
  return hit.count <= limit;
}

/** The caller's IP from the proxy headers Vercel sets. "local" when there are none. */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}

/** Tests only. */
export function resetRateLimits() {
  hits().clear();
}

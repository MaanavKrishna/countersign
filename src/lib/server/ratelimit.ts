import "server-only";
// Per-instance sliding-window limiter. Serverless instances don't share memory, so this
// bounds abuse per warm instance rather than globally; a shared store (or a platform
// firewall rule) is the production upgrade.

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function createLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const hits = new Map<string, number[]>();
  return {
    check(key: string): { ok: boolean; retryAfterSec: number } {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((h) => t - h < opts.windowMs);
      if (recent.length >= opts.limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.ceil((opts.windowMs - (t - recent[0])) / 1000) };
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > 5000) hits.delete(hits.keys().next().value!);
      return { ok: true, retryAfterSec: 0 };
    },
  };
}

export const investigateLimiter = createLimiter({ limit: 8, windowMs: 10 * 60_000 });
export const shieldLimiter = createLimiter({ limit: 90, windowMs: 10 * 60_000 });

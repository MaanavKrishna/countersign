import { describe, expect, it } from "vitest";
import { clientIp, createLimiter } from "@/lib/server/ratelimit";

describe("rate limiter", () => {
  it("allows up to the limit then blocks until the window slides", () => {
    let t = 0;
    const lim = createLimiter({ limit: 2, windowMs: 1000, now: () => t });
    expect(lim.check("a").ok).toBe(true);
    expect(lim.check("a").ok).toBe(true);
    const blocked = lim.check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
    expect(lim.check("b").ok).toBe(true); // keys are independent
    t = 1001;
    expect(lim.check("a").ok).toBe(true);
  });
  it("keys on the first forwarded IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

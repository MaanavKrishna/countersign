import { describe, expect, it } from "vitest";
import { shouldInvestigate } from "../channels/inboxPolicy";

const msg = (o: Partial<{ id: string; from: string; subject: string | null; labels: string[]; text: string | null; ai: { verification: null; auto_reply?: number } }>) => ({
  id: "m1", from: "me@example.com", subject: "Fwd: check this", labels: [] as string[], text: "---------- Forwarded message ---------\nFrom: x <x@y.top>\nSubject: s\n\nbody", ai: { verification: null }, ...o,
});

describe("inbox policy", () => {
  it("investigates a fresh forwarded message once", () => {
    expect(shouldInvestigate(msg({ id: "fresh-1" })).ok).toBe(true);
    expect(shouldInvestigate(msg({ id: "fresh-1" })).ok).toBe(false); // same signed message id
  });
  it("skips messages it already answered", () => {
    expect(shouldInvestigate(msg({ id: "a2", labels: ["countersign:forgery"] })).ok).toBe(false);
  });
  it("skips auto-replies so it never ping-pongs", () => {
    expect(shouldInvestigate(msg({ id: "a3", subject: "Automatic reply: out of office" })).ok).toBe(false);
    expect(shouldInvestigate(msg({ id: "a4", ai: { verification: null, auto_reply: 0.9 } })).ok).toBe(false);
  });
  it("won't reply to a direct (non-forwarded) message whose sender failed authentication", () => {
    expect(shouldInvestigate(msg({ id: "a5", text: "hello", labels: ["dmarc-fail"] })).ok).toBe(false);
  });
  it("limits each sender", () => {
    const results = Array.from({ length: 12 }, (_, i) => shouldInvestigate(msg({ id: `burst-${i}`, from: "flood@example.com" })).ok);
    expect(results.filter(Boolean).length).toBe(10);
  });
});

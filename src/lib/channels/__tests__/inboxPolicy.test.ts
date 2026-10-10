import { describe, expect, it } from "vitest";
import { heldNotice, shouldInvestigate } from "@/lib/channels/inboxPolicy";

const msg = (o: Partial<{ id: string; from: string; subject: string | null; labels: string[]; text: string | null; headers: Record<string, string | string[]>; ai: { verification: null; auto_reply?: number; risk?: { phishing: number; injection: number } }; withheld: { state: string; reason: string } | null }>) => ({
  id: "m1", from: "me@example.com", subject: "Fwd: check this", labels: [] as string[], text: "---------- Forwarded message ---------\nFrom: x <x@y.top>\nSubject: s\n\nbody", headers: {}, ai: { verification: null }, withheld: null, ...o,
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
    expect(shouldInvestigate(msg({ id: "a4", headers: { "auto-submitted": "auto-replied" } })).ok).toBe(false);
    expect(shouldInvestigate(msg({ id: "a4b", headers: { precedence: "auto_reply" } })).ok).toBe(false);
  });
  it("still investigates a forwarded notification the provider thinks looks automated", () => {
    expect(shouldInvestigate(msg({ id: "a4c", ai: { verification: null, auto_reply: 0.67 } })).ok).toBe(true);
  });
  it("answers a message the provider withheld as phishing without pretending to have read it", () => {
    const held = msg({ id: "h1", text: null, subject: "[held: phishing]", withheld: { state: "held", reason: "phishing" }, ai: { verification: null, risk: { phishing: 0.97, injection: 0.2 } } });
    const n = heldNotice(held);
    expect(n?.subject).toMatch(/^FORGERY/);
    expect(n?.text).toContain("97%");
    expect(heldNotice(msg({ id: "h2" }))).toBeNull();
  });
  it("won't reply to a direct (non-forwarded) message whose sender failed authentication", () => {
    expect(shouldInvestigate(msg({ id: "a5", text: "hello", labels: ["dmarc-fail"] })).ok).toBe(false);
  });
  it("limits each sender", () => {
    const results = Array.from({ length: 12 }, (_, i) => shouldInvestigate(msg({ id: `burst-${i}`, from: "flood@example.com" })).ok);
    expect(results.filter(Boolean).length).toBe(10);
  });
});

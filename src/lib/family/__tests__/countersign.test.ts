import { describe, expect, it } from "vitest";
import { GRACE_SECONDS, STEP_SECONDS, codeFor, codesForDisplay, newSecret, pairingLink, parsePairingFragment, stepAt, type Pairing } from "@/lib/family/protocol";
import { WORDS } from "@/lib/family/wordlist";

const SECRET = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"; // bytes 0..31, base64url

describe("Family Countersign protocol", () => {
  it("makes 32-byte base64url secrets that differ each time", () => {
    const a = newSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSecret()).not.toBe(a);
  });
  it("derives three dictionary words, deterministically", async () => {
    const w = await codeFor(SECRET, "a", "b", 1000);
    expect(w).toHaveLength(3);
    for (const x of w) expect(WORDS).toContain(x);
    expect(await codeFor(SECRET, "a", "b", 1000)).toEqual(w);
  });
  it("uses a different code per direction (relay-attack defence) and per step", async () => {
    const ab = await codeFor(SECRET, "a", "b", 1000);
    expect(await codeFor(SECRET, "b", "a", 1000)).not.toEqual(ab);
    expect(await codeFor(SECRET, "a", "b", 1001)).not.toEqual(ab);
    expect(await codeFor(newSecret(), "a", "b", 1000)).not.toEqual(ab);
  });
  it("shows each side the other's code", async () => {
    const t = 1_000 * STEP_SECONDS * 1000 + 30_000; // 30s into step 1000
    const grandma: Pairing = { id: "1", me: "Grandma", them: "Ethan", role: "a", secret: SECRET, createdAt: 0 };
    const ethan: Pairing = { ...grandma, me: "Ethan", them: "Grandma", role: "b" };
    const g = await codesForDisplay(grandma, t);
    const e = await codesForDisplay(ethan, t);
    expect(g.theirs).toEqual(e.mine); // what Grandma expects is what Ethan says
    expect(e.theirs).toEqual(g.mine);
    expect(g.secondsLeft).toBe(30);
    expect(g.theirsPrevious).toBeNull();
  });
  it("accepts the previous step during the grace window", async () => {
    const t = 1_001 * STEP_SECONDS * 1000 + (GRACE_SECONDS - 5) * 1000; // 15s into step 1001
    const grandma: Pairing = { id: "1", me: "Grandma", them: "Ethan", role: "a", secret: SECRET, createdAt: 0 };
    const g = await codesForDisplay(grandma, t);
    expect(stepAt(t)).toBe(1001);
    expect(g.theirsPrevious).toEqual(await codeFor(SECRET, "b", "a", 1000));
  });
  it("accepts the next step when the caller's clock runs ahead", async () => {
    const t = 1_000 * STEP_SECONDS * 1000 + 50_000; // 50s into step 1000; caller already at 1001
    const grandma: Pairing = { id: "1", me: "Grandma", them: "Ethan", role: "a", secret: SECRET, createdAt: 0 };
    const g = await codesForDisplay(grandma, t);
    expect(g.theirsNext).toEqual(await codeFor(SECRET, "b", "a", 1001));
    const mid = await codesForDisplay(grandma, 1_000 * STEP_SECONDS * 1000 + 30_000);
    expect(mid.theirsNext).toBeNull();
  });
  it("round-trips pairing links with the secret only in the fragment", () => {
    const link = pairingLink("https://cs.example", "Grandma", "Ethan Ray", SECRET);
    const u = new URL(link);
    expect(u.pathname).toBe("/family/pair");
    expect(u.search).toBe("");
    expect(parsePairingFragment(u.hash)).toEqual({ secret: SECRET, a: "Grandma", b: "Ethan Ray" });
  });
  it("rejects malformed fragments", () => {
    expect(parsePairingFragment("#v=1&s=short&a=x&b=y")).toBeNull();
    expect(parsePairingFragment("#v=2&s=" + SECRET + "&a=x&b=y")).toBeNull();
    expect(parsePairingFragment("")).toBeNull();
  });
});

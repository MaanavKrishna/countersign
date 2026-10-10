import { describe, expect, it } from "vitest";
import { GRACE_SECONDS, STEP_SECONDS } from "../countersign/protocol";
import { MAX_MEMBERS, MAX_NAME, circleJoinLink, cleanName, memberCode, memberCodesForDisplay, normalizeName, parseJoinFragment, type Circle } from "../countersign/circle";
import { addCircle, joinStatus } from "../countersign/store";
import { WORDS } from "../countersign/wordlist";

const SECRET = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
const circle: Circle = { id: "c1", name: "Krishna family", secret: SECRET, members: ["Grandma", "Ethan", "Priya"], me: "Grandma", lang: "en", createdAt: 0 };

describe("Family Circle protocol", () => {
  it("gives each member their own three words", async () => {
    const e = await memberCode(SECRET, "Ethan", 1000);
    const p = await memberCode(SECRET, "Priya", 1000);
    expect(e).toHaveLength(3);
    for (const w of e) expect(WORDS).toContain(w);
    expect(e).not.toEqual(p);
    expect(await memberCode(SECRET, "Ethan", 1001)).not.toEqual(e);
  });
  it("treats composed and decomposed accents as the same name", async () => {
    const composed = "Luc\u00eda"; // í as one character
    const decomposed = "Luci\u0301a"; // i + combining acute
    expect(normalizeName(composed)).toBe(normalizeName(decomposed));
    expect(await memberCode(SECRET, composed, 9)).toEqual(await memberCode(SECRET, decomposed, 9));
  });
  it("is the same on every device regardless of how the name is typed", async () => {
    expect(normalizeName("  ethan   RAY ")).toBe("ethan ray");
    expect(await memberCode(SECRET, "Ethan Ray", 5)).toEqual(await memberCode(SECRET, " ethan  ray", 5));
  });
  it("can't be confused with a two-person pairing code", async () => {
    const { codeFor } = await import("../countersign/protocol");
    expect(await memberCode(SECRET, "a", 1000)).not.toEqual(await codeFor(SECRET, "a", "b", 1000));
  });
  it("shows clock-skew alternates at both ends of the minute", async () => {
    const early = await memberCodesForDisplay(circle, "Ethan", 1000 * STEP_SECONDS * 1000 + 5_000);
    expect(early.alt).toEqual(await memberCode(SECRET, "Ethan", 999));
    const late = await memberCodesForDisplay(circle, "Ethan", 1000 * STEP_SECONDS * 1000 + (STEP_SECONDS - GRACE_SECONDS + 5) * 1000);
    expect(late.alt).toEqual(await memberCode(SECRET, "Ethan", 1001));
    const mid = await memberCodesForDisplay(circle, "Ethan", 1000 * STEP_SECONDS * 1000 + 30_000);
    expect(mid.alt).toBeNull();
    expect(mid.secondsLeft).toBe(30);
  });
  it("round-trips join links with the secret only in the fragment", () => {
    const u = new URL(circleJoinLink("https://cs.example", circle));
    expect(u.pathname).toBe("/family/join");
    expect(u.search).toBe("");
    expect(parseJoinFragment(u.hash)).toEqual({ secret: SECRET, name: "Krishna family", members: ["Grandma", "Ethan", "Priya"], lang: "en", replaces: null });
  });
  it("rejects malformed join links", () => {
    expect(parseJoinFragment("#v=2&s=short&c=x&m=a")).toBeNull();
    expect(parseJoinFragment(`#v=2&s=${SECRET}&c=&m=a`)).toBeNull();
    expect(parseJoinFragment("")).toBeNull();
  });
});

describe("member names survive the join link intact", () => {
  it("strips commas so one name never splits into two", () => {
    expect(cleanName("Smith, John")).toBe("Smith John");
    const c: Circle = { ...circle, members: ["Grandma", cleanName("Smith, John")] };
    expect(parseJoinFragment(new URL(circleJoinLink("https://x.example", c)).hash)?.members).toEqual(["Grandma", "Smith John"]);
  });
  it("applies the same length limit on both phones", async () => {
    const long = "A".repeat(MAX_NAME + 20);
    expect(cleanName(long)).toHaveLength(MAX_NAME);
    const c: Circle = { ...circle, members: ["Grandma", cleanName(long)] };
    const parsed = parseJoinFragment(new URL(circleJoinLink("https://x.example", c)).hash)!;
    expect(await memberCode(SECRET, parsed.members[1], 7)).toEqual(await memberCode(SECRET, c.members[1], 7));
  });
  it("drops duplicate names that differ only in case or spacing", () => {
    expect(parseJoinFragment(`#v=2&s=${SECRET}&c=F&m=Ethan,ethan ,Priya`)?.members).toEqual(["Ethan", "Priya"]);
  });
  it("rejects a link with more members than any phone would accept", () => {
    const many = Array.from({ length: MAX_MEMBERS + 1 }, (_, i) => `M${i}`).join(",");
    expect(parseJoinFragment(`#v=2&s=${SECRET}&c=F&m=${many}`)).toBeNull();
  });
});

describe("circle store helpers", () => {
  it("adds a circle once per secret", () => {
    const one = addCircle([], { ...circle });
    expect(addCircle(one, { ...circle, me: "Ethan" })).toHaveLength(1);
  });
  it("reports whether this device already belongs to the circle", () => {
    expect(joinStatus([], SECRET)).toBe("ok");
    expect(joinStatus(addCircle([], circle), SECRET)).toBe("member");
  });
});

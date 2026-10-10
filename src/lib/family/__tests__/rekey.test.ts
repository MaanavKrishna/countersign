import { describe, expect, it } from "vitest";
import { circleJoinLink, parseJoinFragment, secretTag, type Circle } from "@/lib/family/circle";
import { addCircle, rekeyCircle } from "@/lib/family/store";

const OLD = "A".repeat(43);
const NEW = "B".repeat(43);
const circle: Circle = { id: "c1", name: "Krishna family", secret: OLD, members: ["Grandma", "Ethan", "Ex"], me: "Grandma", lang: "en", createdAt: 1 };

describe("starting a circle fresh (new secret)", () => {
  it("secretTag is a short, stable fingerprint that does not reveal the secret", async () => {
    const t = await secretTag(OLD);
    expect(t).toMatch(/^[0-9a-f]{16}$/);
    expect(await secretTag(OLD)).toBe(t);
    expect(await secretTag(NEW)).not.toBe(t);
  });

  it("rekeyCircle swaps the secret, drops the removed member, never drops me, and remembers what it replaces", async () => {
    const tag = await secretTag(OLD);
    const [c] = rekeyCircle([circle], "c1", NEW, tag, "ex");
    expect(c.secret).toBe(NEW);
    expect(c.members).toEqual(["Grandma", "Ethan"]);
    expect(c.replaces).toBe(tag);
    expect(rekeyCircle([circle], "c1", NEW, tag, "Grandma")[0].members).toContain("Grandma");
  });

  it("the join link carries the replaced tag, and parsing reads it back", async () => {
    const tag = await secretTag(OLD);
    const [c] = rekeyCircle([circle], "c1", NEW, tag, null);
    const link = circleJoinLink("https://x.app", c);
    expect(link).not.toContain(OLD);
    expect(parseJoinFragment(link.split("#")[1])?.replaces).toBe(tag);
    expect(parseJoinFragment(link.split("#")[1].replace(tag, "nothex"))?.replaces).toBeNull();
  });

  it("addCircle can replace the old circle in one step", () => {
    const next = addCircle([circle], { ...circle, id: "c2", secret: NEW }, "c1");
    expect(next.map((c) => c.id)).toEqual(["c2"]);
  });
});

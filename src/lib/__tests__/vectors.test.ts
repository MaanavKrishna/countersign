import { describe, expect, it } from "vitest";
import { memberCode } from "../countersign/circle";
import { codeFor } from "../countersign/protocol";

// Pins the published test vectors in docs/PROTOCOL.md. If this fails, the
// protocol changed and every paired phone would stop agreeing.
const SECRET = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"; // bytes 0x00..0x1f

describe("PROTOCOL.md test vectors", () => {
  it.each([
    ["a", "b", 1000, "bomb icon sentence"],
    ["b", "a", 1000, "favorite mosquito ordinary"],
    ["a", "b", 1001, "ivory any plunge"],
  ] as const)("v1 %s>%s step %i", async (from, to, step, expected) => {
    expect((await codeFor(SECRET, from, to, step)).join(" ")).toBe(expected);
  });
  it.each([
    ["Ethan", "en", "bulb peasant position"],
    [" ethan ", "en", "bulb peasant position"],
    ["Ethan", "es", "besar ola paella"],
  ] as const)("v2 member %j (%s)", async (member, lang, expected) => {
    expect((await memberCode(SECRET, member, 1000, lang)).join(" ")).toBe(expected);
  });
});

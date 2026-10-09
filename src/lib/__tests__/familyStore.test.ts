import { describe, expect, it } from "vitest";
import { addPairing, canAccept } from "../countersign/store";

const base = { me: "Grandma", them: "Ethan", role: "a" as const, secret: "S".repeat(43) };

describe("family store helpers", () => {
  it("addPairing is idempotent per secret", () => {
    const one = addPairing([], base);
    const two = addPairing(one, base);
    expect(two).toHaveLength(1);
    expect(one[0].id).toMatch(/[0-9a-f-]{36}/);
  });
  it("refuses to pair with yourself", () => {
    const mine = addPairing([], base);
    expect(canAccept(mine, { secret: base.secret })).toBe("self");
    expect(canAccept([], { secret: base.secret })).toBe("ok");
  });
  it("reports a repeat scan on the partner's phone as a duplicate", () => {
    const theirs = addPairing([], { ...base, role: "b" });
    expect(canAccept(theirs, { secret: base.secret })).toBe("duplicate");
  });
});

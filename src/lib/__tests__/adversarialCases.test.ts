import { describe, expect, it } from "vitest";
import { ADVERSARIAL_CASES } from "../eval/adversarialCases";
import { EVAL_CASES } from "../eval/cases";
import { HARD_CASES } from "../eval/hardCases";

describe("adversarial set", () => {
  it("has unique ids across every set and both labels", () => {
    const ids = [...EVAL_CASES, ...HARD_CASES, ...ADVERSARIAL_CASES].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ADVERSARIAL_CASES.filter((c) => c.label === "scam").length).toBe(8);
    expect(ADVERSARIAL_CASES.filter((c) => c.label === "legit").length).toBe(4);
  });
});

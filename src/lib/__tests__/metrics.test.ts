import { describe, expect, it } from "vitest";
import { summarize, type EvalRow } from "../eval/metrics";

const row = (label: "scam" | "legit", band: EvalRow["band"]): EvalRow => ({ id: "x", label, band, risk: 0, ms: 0 });

describe("summarize", () => {
  it("counts a scam as caught only when it is FORGERY, and a false alarm only when legit is FORGERY", () => {
    const m = summarize([row("scam", "forgery"), row("scam", "unverified"), row("legit", "countersigned"), row("legit", "forgery")]);
    expect(m.tp).toBe(1);
    expect(m.fn).toBe(1);
    expect(m.fp).toBe(1);
    expect(m.tn).toBe(1);
    expect(m.precision).toBeCloseTo(0.5);
    expect(m.recall).toBeCloseTo(0.5);
    expect(m.falsePositiveRate).toBeCloseTo(0.5);
    expect(m.dangerousMisses).toBe(0); // scam marked countersigned
    expect(m.strictAccuracy).toBeCloseTo(0.5);
  });
  it("counts a scam cleared as genuine as a dangerous miss", () => {
    expect(summarize([row("scam", "countersigned")]).dangerousMisses).toBe(1);
  });
});

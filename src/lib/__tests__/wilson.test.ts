import { describe, expect, it } from "vitest";
import { wilson } from "../eval/metrics";

describe("wilson 95% interval", () => {
  it("is honest about perfect scores on small samples", () => {
    const [lo, hi] = wilson(14, 14);
    expect(hi).toBe(1);
    expect(lo).toBeCloseTo(0.785, 2);
  });
  it("matches a textbook value", () => {
    const [lo, hi] = wilson(36, 38);
    expect(lo).toBeCloseTo(0.827, 2);
    expect(hi).toBeCloseTo(0.985, 2);
  });
  it("handles zero trials", () => {
    expect(wilson(0, 0)).toEqual([0, 1]);
  });
});

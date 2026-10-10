import { describe, expect, it } from "vitest";
import { ADVERSARIAL_CASES } from "@/lib/eval/adversarialCases";
import { EVAL_CASES } from "@/lib/eval/cases";
import { MENTION_CASES, QR_CASES } from "@/lib/eval/freshCases";
import { HARD_CASES } from "@/lib/eval/hardCases";

describe("run-5 sets", () => {
  it("QR pairs share their text and differ only in the code's link", () => {
    for (let i = 0; i < QR_CASES.length; i += 2) {
      const [scam, real] = [QR_CASES[i], QR_CASES[i + 1]];
      expect([scam.label, real.label]).toEqual(["scam", "legit"]);
      expect(scam.text).toBe(real.text);
      expect(scam.qr).not.toBe(real.qr);
    }
  });
  it("has unique ids across every set", () => {
    const ids = [...EVAL_CASES, ...HARD_CASES, ...ADVERSARIAL_CASES, ...QR_CASES, ...MENTION_CASES].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { describe, expect, it } from "vitest";
import { judgmentFinding } from "../judgment";
import { finding, score } from "../scoring";

describe("model's overall judgment as evidence", () => {
  it("adds risk for 'scam', trust for 'legitimate', nothing for 'unsure'", () => {
    expect(judgmentFinding("scam", "fake bank alert")?.signalId).toBe("model_judgment_scam");
    expect(judgmentFinding("legitimate", "routine receipt")?.kind).toBe("trust");
    expect(judgmentFinding("unsure", "")).toBeNull();
  });
  it("can't clear a message on its own when the evidence is strong", () => {
    const strong = [finding("lookalike_brand_domain", ""), finding("dmarc_fail", ""), finding("ai_directed_instructions", "")];
    expect(score([...strong, judgmentFinding("legitimate", "x")!]).band).not.toBe("countersigned");
  });
  it("tips an evidence-light scam over the line", () => {
    const light = [finding("tactic_credentials", ""), finding("tactic_urgency", "")];
    expect(score(light).band).toBe("unverified");
    expect(score([...light, judgmentFinding("scam", "x")!]).band).toBe("forgery");
  });
  it("ignores a 'genuine' vote when impersonation or injection evidence is present", () => {
    const imp = [finding("impersonation_with_ask", "")];
    expect(score([...imp, judgmentFinding("legitimate", "x")!]).risk).toBeCloseTo(score(imp).risk, 3);
    const inj = [finding("ai_directed_instructions", "")];
    expect(score([...inj, judgmentFinding("legitimate", "x")!]).band).not.toBe("countersigned");
  });
});

import { describe, expect, it } from "vitest";
import { toInvestigationInput } from "../channels/agentboxd";
import { firstDelivery } from "../channels/dedupe";

const base = { from: "Bank <alerts@bank-verify.top>", reply_to: null, subject: "Verify now", text: "Click to verify within 2 hours.", labels: [] as string[], ai: { verification: null } };

describe("toInvestigationInput", () => {
  it("builds header lines for a directly-received message and maps provider auth labels", () => {
    const input = toInvestigationInput({ ...base, labels: ["dmarc-fail", "spf-fail"] });
    expect(input.text).toMatch(/^From: Bank <alerts@bank-verify\.top>\nSubject: Verify now\nAuthentication-Results: agentboxd; spf=fail; dmarc=fail\n\nClick to verify/);
  });
  it("forwarded email ignores provider auth labels", () => {
    const fwd = { ...base, from: "me@gmail.com", subject: "Fwd: Verify now", labels: ["dmarc-pass", "spf-pass"], text: "---------- Forwarded message ---------\nFrom: Bank <alerts@bank-verify.top>\nSubject: Verify now\n\nClick to verify." };
    const input = toInvestigationInput(fwd);
    expect(input.text).toContain("From: Bank <alerts@bank-verify.top>");
    expect(input.text).not.toContain("Authentication-Results");
    expect(input.text).not.toContain("me@gmail.com");
  });
  it("turns the provider's risk scores into findings above 0.5 only", () => {
    const hi = toInvestigationInput({ ...base, ai: { verification: null, risk: { phishing: 0.91, injection: 0.8 } } });
    expect(hi.extraFindings?.map((f) => f.signalId).sort()).toEqual(["ai_directed_instructions", "provider_phishing_flag"]);
    const lo = toInvestigationInput({ ...base, ai: { verification: null, risk: { phishing: 0.2, injection: 0.1 } } });
    expect(lo.extraFindings).toEqual([]);
  });
});

describe("webhook dedupe", () => {
  it("dedupes repeated deliveries", () => {
    expect(firstDelivery("d1")).toBe(true);
    expect(firstDelivery("d1")).toBe(false);
    expect(firstDelivery("")).toBe(true); // no id: never dropped
  });
});

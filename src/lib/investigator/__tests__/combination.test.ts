import { describe, expect, it } from "vitest";
import { impersonationAsk } from "@/lib/investigator/combination";
import { finding, score } from "@/lib/core/scoring";

describe("impersonation + ask", () => {
  it("fires when a message claims an identity and asks for codes, money or access", () => {
    const f = impersonationAsk([finding("tactic_authority", "Chase"), finding("tactic_credentials", "6-digit code")], []);
    expect(f.map((x) => x.signalId)).toEqual(["impersonation_with_ask"]);
  });
  it("describes what is being asked for in plain words", () => {
    const [f] = impersonationAsk([finding("lookalike_brand_domain", "x"), finding("tactic_credentials", '"confirm your card"', "Credential request")], []);
    expect(f.detail).toContain("asks for codes or account details");
    expect(f.detail).not.toContain("request for credential request");
  });
  it("counts a named brand as a claimed identity", () => {
    expect(impersonationAsk([finding("tactic_payment", "Cash App deposit")], ["Amazon"])).toHaveLength(1);
  });
  it("counts infrastructure impersonation as a claimed identity", () => {
    expect(impersonationAsk([finding("lookalike_brand_domain", "x"), finding("tactic_remote_access", "connect remotely")], [])).toHaveLength(1);
  });
  it("needs both halves", () => {
    expect(impersonationAsk([finding("tactic_authority", "IRS")], [])).toEqual([]);
    expect(impersonationAsk([finding("tactic_payment", "gift cards")], [])).toEqual([]);
  });
  it("never fires on mail authenticated by the brand's own domain", () => {
    expect(impersonationAsk([finding("tactic_credentials", "code"), finding("trust_auth_aligned", "chase.com")], ["Chase"])).toEqual([]);
  });
  it("pushes a tactic-only impersonation scam into FORGERY", () => {
    const base = [finding("tactic_authority", "a"), finding("tactic_credentials", "b"), finding("tactic_urgency", "c")];
    expect(score(base).band).toBe("unverified");
    expect(score([...base, ...impersonationAsk(base, [])]).band).toBe("forgery");
  });
});

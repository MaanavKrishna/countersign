import { describe, expect, it } from "vitest";
import { claimedBrandForeignLink, impersonationAsk } from "@/lib/investigator/combination";
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
  it("doesn't fire when every link is on the claimed brand's own domains: the infrastructure corroborates the claim", () => {
    const f = impersonationAsk([finding("tactic_authority", "Microsoft"), finding("tactic_credentials", "re-register"), finding("trust_links_on_brand", "all on microsoft.com")], ["Microsoft"]);
    expect(f).toEqual([]);
  });
});

describe("claimed brand, foreign link", () => {
  it("flags a link to a domain that carries the claimed brand's name but isn't the brand's", () => {
    const f = claimedBrandForeignLink(["https://amazon-returns-dropoff.com/label/1"], ["Amazon"]);
    expect(f.map((x) => x.signalId)).toEqual(["claimed_brand_foreign_link"]);
    expect(score(f).band).toBe("unverified");
  });
  it("leaves the brand's real domains and unclaimed brands alone", () => {
    expect(claimedBrandForeignLink(["https://www.amazon.com/spr/returns"], ["Amazon"])).toEqual([]);
    expect(claimedBrandForeignLink(["https://amazon-returns-dropoff.com/x"], ["PayPal"])).toEqual([]);
  });
});

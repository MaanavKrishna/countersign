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
  it("doesn't fire when links on the brand's domains are the ONLY way to respond: the infrastructure corroborates the claim", () => {
    const f = impersonationAsk([finding("tactic_authority", "Microsoft"), finding("tactic_credentials", "re-register"), finding("trust_links_on_brand", "all on microsoft.com")], ["Microsoft"], { phones: 0, replyElsewhere: false });
    expect(f).toEqual([]);
  });
  it("still fires when the message also gives a phone number or a reply address elsewhere (callback scams)", () => {
    const base = [finding("tactic_authority", "Chase fraud"), finding("tactic_credentials", "read us the code"), finding("trust_links_on_brand", "chase.com")];
    expect(impersonationAsk(base, ["Chase"], { phones: 1, replyElsewhere: false }).map((x) => x.signalId)).toEqual(["impersonation_with_ask"]);
    expect(impersonationAsk(base, ["Chase"], { phones: 0, replyElsewhere: true }).map((x) => x.signalId)).toEqual(["impersonation_with_ask"]);
    expect(impersonationAsk(base, ["Chase"]).map((x) => x.signalId)).toEqual(["impersonation_with_ask"]);
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
  it.each([
    ["https://groups.io/g/x", "UPS"],
    ["https://www.firstbank.com/x", "IRS"],
    ["https://www.citizensbank.com/x", "Citi"],
    ["https://purchase-portal.com/x", "Chase"],
    ["https://www.steamboatresort.com/x", "Steam"],
    ["https://www.amazon.fr/x", "Amazon"],
    ["https://www.paypalobjects.com/x", "PayPal"],
  ])("doesn't flag %s for %s: the brand name must be a whole word, and brand.<country> is the brand", (url, brand) => {
    expect(claimedBrandForeignLink([url], [brand])).toEqual([]);
  });
  it("still flags brand-word lookalikes", () => {
    expect(claimedBrandForeignLink(["https://ups-redelivery.top/x"], ["UPS"])).toHaveLength(1);
    expect(claimedBrandForeignLink(["https://secure-chase-alerts.com/x"], ["Chase"])).toHaveLength(1);
  });
});

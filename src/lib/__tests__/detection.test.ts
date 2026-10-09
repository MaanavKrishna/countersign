import { describe, expect, it } from "vitest";
import { defang, registrableDomain } from "../domain";
import { extractIndicators, parseHeaders } from "../indicators";
import { finding, score } from "../scoring";
import { emailAuth, parseAuthResults } from "../tools/emailAuth";
import { classifyDomain, editDistance, lookalikeCheck, skeleton } from "../tools/lookalike";
import { ageFindings } from "../tools/rdap";
import { isPrivateAddress, parseUrl, structuralFindings } from "../tools/traceUrl";

const PHISH = `From: PayPal Service <service@paypa1-secure.com>
Reply-To: help.desk.verify@gmail.com
Return-Path: <bounce@mailer-x.ru>
Subject: Your account access has been limited
Authentication-Results: mx.google.com; spf=softfail smtp.mailfrom=paypa1-secure.com; dkim=none; dmarc=fail (p=NONE) header.from=paypa1-secure.com

Dear Customer, we noticed unusual activity. Your account will be permanently suspended within 24 hours unless you verify your identity at https://bit.ly/3xK9pQ or call +1 (888) 555-0142. Pay the $49.99 fee with an Apple gift card.`;

describe("domain helpers", () => {
  it("extracts registrable domains", () => {
    expect(registrableDomain("a.b.paypal.com")).toBe("paypal.com");
    expect(registrableDomain("shop.example.co.uk")).toBe("example.co.uk");
    expect(registrableDomain("www.bit.ly")).toBe("bit.ly");
  });
  it("defangs links", () => {
    expect(defang("https://evil.com/x")).toBe("hxxps://evil[.]com/x");
    expect(defang("pay $1.99 at usps.com-redelivery.top")).toBe("pay $1.99 at usps[.]com-redelivery[.]top");
  });
});

describe("indicators", () => {
  it("parses headers and body", () => {
    const { headers, body } = parseHeaders(PHISH);
    expect(headers?.["reply-to"]).toContain("gmail.com");
    expect(body.startsWith("Dear Customer")).toBe(true);
  });
  it("does not treat prose with a colon as headers", () => {
    expect(parseHeaders("Note: call me back\nthanks").headers).toBeNull();
  });
  it("extracts everything a scam leans on", () => {
    const ind = extractIndicators(PHISH);
    expect(ind.senderDomain).toBe("paypa1-secure.com");
    expect(ind.replyToDomain).toBe("gmail.com");
    expect(ind.displayName).toBe("PayPal Service");
    expect(ind.urls).toContain("https://bit.ly/3xK9pQ");
    expect(ind.domains).toEqual(expect.arrayContaining(["paypa1-secure.com", "gmail.com", "bit.ly"]));
    // Routing headers name infrastructure, not the scammer.
    expect(ind.domains).not.toContain("google.com");
    expect(ind.urls.some((u) => u.includes("mx.google.com"))).toBe(false);
    expect(ind.phones[0]).toContain("888");
    expect(ind.money).toContain("$49.99");
    expect(ind.paymentMethods).toContain("gift card");
    expect(ind.claimedBrands).toContain("PayPal");
  });
  it("finds scheme-less links in texts", () => {
    const ind = extractIndicators("USPS: your parcel is held. Update address at usps-redelivery.top/track now.");
    expect(ind.urls).toContain("usps-redelivery.top/track");
    expect(ind.claimedBrands).toContain("USPS");
  });
  it("ignores short brand tokens inside words", () => {
    expect(extractIndicators("our groups are startups").claimedBrands).not.toContain("UPS");
  });
});

describe("lookalike detection", () => {
  it("normalizes digit substitutions", () => {
    expect(skeleton("paypa1")).toBe("paypal");
    expect(skeleton("rnicrosoft")).toBe("microsoft");
  });
  it("computes transpositions as one edit", () => {
    expect(editDistance("amazno", "amazon")).toBe(1);
  });
  it("recognizes the real brand", () => {
    expect(classifyDomain("www.paypal.com").kind).toBe("exact");
    expect(classifyDomain("email.apple.com").kind).toBe("exact");
  });
  it("catches character swaps", () => {
    const r = classifyDomain("paypa1.com");
    expect(r.kind).toBe("lookalike");
    expect(r.brand?.name).toBe("PayPal");
  });
  it("catches Cyrillic homoglyphs via punycode", () => {
    // "аpple.com" with a Cyrillic а
    expect(classifyDomain("xn--pple-43d.com").kind).toBe("homoglyph");
  });
  it("catches brand in subdomain", () => {
    expect(classifyDomain("paypal.com.account-check.ru").kind).toBe("subdomain");
    expect(classifyDomain("usps.com-redelivery.top").kind).toBe("subdomain");
    expect(classifyDomain("amazon.verify-account.net").kind).toBe("subdomain");
  });
  it("treats a digit-swapped brand inside a domain as a lookalike", () => {
    expect(classifyDomain("paypa1-secure.com").kind).toBe("lookalike");
  });
  it("catches brand token in unrelated domain", () => {
    const r = classifyDomain("paypal-secure-login.com");
    expect(["token", "lookalike"]).toContain(r.kind);
  });
  it("leaves unrelated domains alone", () => {
    expect(classifyDomain("wikipedia.org").kind).toBe("none");
    expect(classifyDomain("groups.io").kind).toBe("none");
  });
  it("emits a deceptive graph edge", () => {
    const out = lookalikeCheck("paypa1-secure.com");
    expect(out.findings[0].weight).toBeGreaterThan(0.4);
    expect(out.graph.edges.some((e) => e.deceptive)).toBe(true);
  });
});

describe("email authentication", () => {
  it("parses Authentication-Results", () => {
    expect(parseAuthResults("spf=pass smtp.mailfrom=x; dkim=pass; dmarc=fail")).toEqual({ spf: "pass", dkim: "pass", dmarc: "fail" });
  });
  it("flags spoofed brand mail", () => {
    const ids = emailAuth(extractIndicators(PHISH)).findings.map((f) => f.signalId);
    expect(ids).toEqual(expect.arrayContaining(["spf_fail", "dmarc_fail", "reply_to_mismatch", "brand_mismatch_sender", "return_path_mismatch"]));
  });
  it("trusts authenticated mail from the brand", () => {
    const legit = `From: GitHub <noreply@github.com>
Subject: [GitHub] A new SSH key was added
Authentication-Results: mx.google.com; dkim=pass header.i=@github.com; spf=pass; dmarc=pass header.from=github.com

A new public key was added to your account. Visit https://github.com/settings/keys`;
    const ids = emailAuth(extractIndicators(legit)).findings.map((f) => f.signalId);
    expect(ids).toContain("trust_auth_aligned");
    expect(ids).not.toContain("brand_mismatch_sender");
  });
});

describe("link structure", () => {
  it("spots shorteners, IP hosts and @ tricks", () => {
    expect(structuralFindings(parseUrl("https://bit.ly/abc")!).map((f) => f.signalId)).toContain("url_shortener");
    expect(structuralFindings(parseUrl("http://185.212.47.9/login")!).map((f) => f.signalId)).toContain("ip_host_url");
    expect(structuralFindings(parseUrl("https://paypal.com@evil.top/x")!).map((f) => f.signalId)).toEqual(
      expect.arrayContaining(["url_at_trick", "risky_tld"]),
    );
  });
  it("blocks private and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.5", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });
});

describe("domain age", () => {
  it("bands registration age", () => {
    expect(ageFindings("x.com", 3, null)[0].signalId).toBe("domain_age_lt_7d");
    expect(ageFindings("x.com", 20, null)[0].signalId).toBe("domain_age_lt_30d");
    expect(ageFindings("x.com", 3000, null)[0].kind).toBe("trust");
  });
});

describe("scoring", () => {
  it("combines evidence with a noisy-OR", () => {
    const s = score([finding("lookalike_brand_domain", ""), finding("dmarc_fail", "")]);
    expect(s.risk).toBeCloseTo(1 - 0.3 * 0.55, 3);
    expect(s.band).toBe("forgery");
  });
  it("counts each signal once", () => {
    const one = score([finding("url_shortener", "")]);
    const many = score([finding("url_shortener", "a"), finding("url_shortener", "b"), finding("url_shortener", "c")]);
    expect(many.risk).toBe(one.risk);
  });
  it("doesn't let an old domain vouch for an impersonation", () => {
    const s = score([finding("lookalike_brand_domain", ""), finding("trust_domain_established", "")]);
    expect(s.risk).toBeCloseTo(0.7, 3);
  });
  it("lets trust evidence pull the score down", () => {
    const s = score([finding("tactic_urgency", ""), finding("tactic_threat", ""), finding("trust_auth_aligned", ""), finding("trust_links_on_brand", "")]);
    expect(s.band).toBe("countersigned");
  });
  it("is countersigned with no evidence", () => {
    expect(score([]).band).toBe("countersigned");
  });
});

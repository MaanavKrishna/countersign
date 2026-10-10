import { describe, expect, it } from "vitest";
import { renderReportEmail } from "@/lib/investigator/report/emailText";
import type { CaseResult } from "@/lib/investigator/types";

const c: CaseResult = {
  toolsRun: 6,
  elapsedMs: 15000,
  findings: [
    { signalId: "lookalike_brand_domain", label: "Lookalike of a brand domain", detail: "paypa1-secure.com is one character from paypal.com", weight: 0.7, kind: "risk" },
    { signalId: "neutral", label: "Checked", detail: "x", weight: 0, kind: "neutral" },
  ],
  report: {
    band: "forgery", risk: 0.97, headline: "This is not PayPal.", summary: "A phishing email from a lookalike domain https://paypa1-secure.com.",
    scamType: "Credential phishing", tactics: [{ label: "Urgency", quote: "within 24 hours" }],
    actions: ["Don't click the link."], ifCompromised: ["Freeze your card."],
    verify: { brand: "PayPal", url: "https://www.paypal.com/us/smarthelp/contact-us", note: "Type paypal.com yourself." },
    reviewNote: null, degraded: false,
  },
};

describe("renderReportEmail", () => {
  const out = renderReportEmail(c, "https://countersign.example");
  it("leads with the verdict", () => {
    expect(out.subject).toBe("FORGERY (97% risk): This is not PayPal.");
  });
  it("lists risk evidence but not neutral checks", () => {
    expect(out.text).toContain("Lookalike of a brand domain");
    expect(out.text).not.toContain("Checked:");
  });
  it("defangs every link from the message but keeps the official help link live", () => {
    expect(out.text).toContain("hxxps://paypa1-secure[.]com");
    expect(out.text).not.toMatch(/https:\/\/paypa1/);
    expect(out.text).toContain("https://www.paypal.com/us/smarthelp/contact-us");
  });
  it("caps the displayed risk at 99%", () => {
    expect(renderReportEmail({ ...c, report: { ...c.report, risk: 0.999 } }, "x").subject).toContain("99% risk");
  });
  it("defangs a model-written headline that names the fake domain", () => {
    const o = renderReportEmail({ ...c, report: { ...c.report, headline: "paypa1-secure.com is not PayPal" } }, "x");
    expect(o.subject).toContain("paypa1-secure[.]com");
    expect(o.text).not.toMatch(/paypa1-secure\.com/);
  });
});

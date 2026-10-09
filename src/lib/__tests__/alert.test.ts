import { describe, expect, it } from "vitest";
import { alertText, smsLink } from "../countersign/alert";
import { matchesPerson } from "../people";

describe("break-the-secrecy alert", () => {
  it("names who is being impersonated and what they want", () => {
    const t = alertText("grandson Ethan", [{ label: "Untraceable payment", quote: "Apple gift cards" }, { label: "Secrecy", quote: "don't tell Mom" }]);
    expect(t).toBe('Countersign alert: someone claiming to be grandson Ethan is on the phone with me asking for money ("Apple gift cards"). Can you call me right now?');
  });
  it("reads naturally when the quote is a full phrase", () => {
    const t = alertText("grandson Ethan", [{ label: "Untraceable payment", quote: "bail is two thousand dollars" }]);
    expect(t).toContain('asking for money ("bail is two thousand dollars")');
  });
  it("says codes when the caller wants credentials", () => {
    expect(alertText("Chase fraud team", [{ label: "Credential request", quote: "read me the code" }])).toContain('asking for my security codes ("read me the code")');
  });
  it("falls back gracefully", () => {
    expect(alertText(null, [])).toBe("Countersign alert: I'm on a call that looks like a scam. Can you call me right now?");
  });
  it("builds an sms link that works on iOS and Android", () => {
    expect(smsLink("+1 (555) 010-0199", "hi there")).toBe("sms:+15550100199?&body=hi%20there");
  });
  it("matches a claimed identity to a saved name by any word", () => {
    expect(matchesPerson("Ethan", "grandson Ethan")).toBe(true);
    expect(matchesPerson("Ethan (grandson)", "it's Ethan")).toBe(true);
    expect(matchesPerson("Priya", "grandson Ethan")).toBe(false);
    expect(matchesPerson("Ethan", null)).toBe(false);
  });
  it("doesn't match on relationship words alone", () => {
    expect(matchesPerson("Ethan (grandson)", "your grandson")).toBe(false);
  });
  it("defangs links quoted from the scammer", () => {
    const t = alertText("PayPal", [{ label: "Credential request", quote: "log in at paypa1-secure.com" }]);
    expect(t).toContain("paypa1-secure[.]com");
  });
});

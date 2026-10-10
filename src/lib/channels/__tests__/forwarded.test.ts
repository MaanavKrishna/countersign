import { describe, expect, it } from "vitest";
import { extractForwarded } from "@/lib/channels/forwarded";

const GMAIL = `Is this real?

---------- Forwarded message ---------
From: PayPal Service <service@paypa1-secure.com>
Date: Fri, Oct 9, 2026 at 9:14 AM
Subject: Your account access has been limited
To: <me@example.com>

Your account will be permanently suspended within 24 hours.`;

const OUTLOOK = `________________________________
From: Chase Alerts <alerts@chase-secure-verify.com>
Sent: Friday, October 9, 2026 9:14 AM
To: Me
Subject: Fraud alert

Reply with the code we sent.`;

describe("extractForwarded", () => {
  it("rebuilds header lines from a Gmail forward", () => {
    const r = extractForwarded(GMAIL);
    expect(r.isForward).toBe(true);
    expect(r.original).toMatch(/^From: PayPal Service <service@paypa1-secure\.com>\nSubject: Your account access has been limited\n\nYour account will be permanently suspended/);
  });
  it("handles Outlook-style forwards", () => {
    const r = extractForwarded(OUTLOOK);
    expect(r.isForward).toBe(true);
    expect(r.original).toContain("From: Chase Alerts <alerts@chase-secure-verify.com>");
    expect(r.original).toContain("Reply with the code we sent.");
  });
  it("passes through a non-forward", () => {
    expect(extractForwarded("hello there")).toEqual({ isForward: false, original: "hello there" });
  });
});

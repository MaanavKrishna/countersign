import { describe, expect, it } from "vitest";
import { collectCase } from "@/lib/investigator/report/collect";

// Live check (model API): EVAL=1 npx vitest run otp
describe.skipIf(!process.env.EVAL)("genuine one-time-code texts", () => {
  it("does not treat a message that GIVES a code as one that asks for it", async () => {
    const r = await collectCase({
      text: "Your Microsoft account verification code is 482913. Don't share this code with anyone. If you didn't request it, you can ignore this message.",
      image: null,
    });
    const ids = r.findings.map((f) => f.signalId);
    console.log(r.report.band, ids.join(","));
    expect(ids).not.toContain("impersonation_with_ask");
    expect(r.report.band).toBe("countersigned");
  }, 120_000);
});

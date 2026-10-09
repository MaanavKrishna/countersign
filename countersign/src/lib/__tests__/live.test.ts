import { describe, expect, it } from "vitest";
import { dnsCheck } from "../tools/dns";
import { rdapLookup } from "../tools/rdap";
import { traceUrl } from "../tools/traceUrl";

// Hits the real network. Run with: LIVE=1 npx vitest run live
describe.skipIf(!process.env.LIVE)("live network tools", () => {
  it("looks up an established domain", async () => {
    const out = await rdapLookup("wikipedia.org");
    console.log(out.summary);
    expect(out.findings[0].signalId).toBe("trust_domain_established");
    const top = await rdapLookup("example.top");
    console.log(top.summary);
  }, 15000);
  it("reads DNS records", async () => {
    const out = await dnsCheck("paypal.com", true);
    console.log(out.summary);
    expect(out.summary).toContain("DMARC ✓");
  }, 15000);
  it("follows a redirect chain with HEAD only", async () => {
    const out = await traceUrl("http://github.com");
    console.log(out.summary);
    expect(out.finalHost).toBe("github.com");
  }, 15000);
  it("refuses private targets", async () => {
    const out = await traceUrl("http://127.0.0.1:3000/admin");
    console.log(out.summary);
    expect(out.summary).toContain("private");
  }, 15000);
});

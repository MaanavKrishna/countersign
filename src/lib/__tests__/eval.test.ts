import { describe, expect, it } from "vitest";
import { runInvestigation } from "../pipeline";
import { SAMPLES } from "../samples";
import type { InvestigationEvent, Report } from "../types";

// End-to-end accuracy check against labelled cases. Calls the model API and
// the network. Run with: EVAL=1 npx vitest run eval

type Case = { id: string; label: "scam" | "legit"; text: string };

const EXTRA: Case[] = [
  {
    id: "crypto-dm",
    label: "scam",
    text: `Hi dear, I'm Sophia, an investment advisor with Coinbase Prime. I've helped many clients earn 30% weekly returns with our AI trading bot. Minimum deposit is only $500 in USDT. Spots are limited and close tonight. Register at https://coinbase-prime-ai.xyz/join and send me a screenshot of your deposit so I can activate your account.`,
  },
  {
    id: "tech-support",
    label: "scam",
    text: `MICROSOFT WINDOWS DEFENDER ALERT: Your computer has been infected with Trojan Spyware. Your banking passwords and photos are being stolen. Do NOT shut down your computer. Call Microsoft Support immediately at +1 (844) 555-0199 so a certified technician can connect remotely and remove the virus. Error code: 0x80070424`,
  },
  {
    id: "invoice-bec",
    label: "scam",
    text: `From: "Mark Chen (CFO)" <mark.chen.cfo@outlook-mail.co>
Reply-To: mark.chen.private@gmail.com
Subject: Urgent wire - confidential

Hi, I'm in back-to-back meetings with the auditors. I need you to process a wire transfer of $48,750 to a new vendor today before 3pm. Keep this between us until the acquisition is announced. I'll send the beneficiary details once you confirm you can do it. Don't call, I can only text right now.`,
  },
  {
    id: "amazon-shipped",
    label: "legit",
    text: `From: "Amazon.com" <shipment-tracking@amazon.com>
Subject: Your Amazon.com order of "Anker USB-C Charger" has shipped!
Authentication-Results: mx.google.com; dkim=pass header.i=@amazon.com; spf=pass smtp.mailfrom=shipment-tracking@amazon.com; dmarc=pass (p=QUARANTINE) header.from=amazon.com

Hello, your package has shipped and is on its way. Arriving Tuesday.
Track your package: https://www.amazon.com/gp/your-account/order-history
Thanks for shopping with us.`,
  },
];

const LABELS: Record<string, "scam" | "legit"> = { paypal: "scam", usps: "scam", himum: "scam", github: "legit" };
const CASES: Case[] = [...SAMPLES.map((s) => ({ id: s.id, label: LABELS[s.id], text: s.text })), ...EXTRA];

describe.skipIf(!process.env.EVAL)("end-to-end eval", () => {
  it(
    "classifies labelled cases",
    async () => {
      const rows: { id: string; label: string; band: string; risk: number; ms: number; ok: boolean }[] = [];
      for (const c of CASES) {
        const t0 = Date.now();
        let report: Report | null = null;
        await runInvestigation({ text: c.text, image: null }, (e: InvestigationEvent) => {
          if (e.type === "report") report = e.report;
        });
        const r = report as Report | null;
        const band = r?.band ?? "none";
        const ok = c.label === "scam" ? band === "forgery" : band === "countersigned";
        rows.push({ id: c.id, label: c.label, band, risk: r?.risk ?? -1, ms: Date.now() - t0, ok });
      }
      console.table(rows);
      const correct = rows.filter((r) => r.ok).length;
      const safe = rows.filter((r) => (r.label === "scam" ? r.band !== "countersigned" : r.band !== "forgery")).length;
      console.log(`Strict accuracy ${correct}/${rows.length} · never-dangerous ${safe}/${rows.length}`);
      expect(safe).toBe(rows.length);
    },
    600_000,
  );
});

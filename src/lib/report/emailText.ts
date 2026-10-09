import { defang } from "../domain";
import type { Band, CaseResult } from "../types";

const WORD: Record<Band, string> = { forgery: "FORGERY", unverified: "UNVERIFIED", countersigned: "COUNTERSIGNED" };

export function renderReportEmail(c: CaseResult, liveUrl: string): { subject: string; text: string } {
  const r = c.report;
  const pct = Math.min(99, Math.round(r.risk * 100));
  const evidence = c.findings
    .filter((f) => f.kind === "risk" || f.kind === "trust")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map((f) => `  ${f.kind === "trust" ? "✓" : "✗"} ${f.label}: ${defang(f.detail)}`);
  const lines = [
    `${WORD[r.band]} · ${pct}% risk · ${r.scamType}`,
    "",
    r.headline,
    defang(r.summary),
    "",
    evidence.length ? "EVIDENCE" : "",
    ...evidence,
    r.tactics.length ? "\nMANIPULATION TACTICS" : "",
    ...r.tactics.map((t) => `  • ${t.label}: "${defang(t.quote)}"`),
    "",
    "WHAT TO DO NOW",
    ...r.actions.map((a, i) => `  ${i + 1}. ${defang(a)}`),
    ...(r.ifCompromised.length ? ["", "IF YOU ALREADY CLICKED, PAID OR SHARED DETAILS", ...r.ifCompromised.map((a, i) => `  ${i + 1}. ${defang(a)}`)] : []),
    ...(r.verify ? ["", `VERIFY WITH ${r.verify.brand.toUpperCase()} DIRECTLY`, `  ${r.verify.note}`, `  Official help: ${r.verify.url}`] : []),
    "",
    "Links from the suspicious message are shown defanged (hxxp, [.]) so they can't be clicked.",
    `Countersign checked ${c.toolsRun} things in ${(c.elapsedMs / 1000).toFixed(0)}s · ${liveUrl}`,
  ];
  return { subject: `${WORD[r.band]} (${pct}% risk): ${r.headline}`, text: lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n") };
}

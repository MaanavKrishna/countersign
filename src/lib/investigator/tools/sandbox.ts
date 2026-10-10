import { normalizeHost } from "@/lib/core/domain";
import { finding } from "@/lib/core/scoring";
import type { Finding } from "@/lib/core/types";
import type { ToolOutput } from "@/lib/investigator/types";
import { urlNodeId } from "@/lib/investigator/tools/graphIds";
import { parseUrl } from "@/lib/investigator/tools/traceUrl";

// Optional: renders the link in urlscan.io's remote browser so the user can
// see the page without visiting it. Enabled only when URLSCAN_API_KEY is set.

type UrlscanResult = {
  page?: { url?: string; domain?: string; ip?: string; country?: string };
  verdicts?: { overall?: { malicious?: boolean; score?: number; brands?: string[]; tags?: string[] } };
};

export const sandboxEnabled = () => !!process.env.URLSCAN_API_KEY;

export async function sandboxScan(raw: string): Promise<ToolOutput & { screenshot: string | null }> {
  const u = parseUrl(raw);
  const empty = { nodes: [], edges: [] };
  if (!u || !sandboxEnabled()) {
    return { summary: "Sandbox not available.", findings: [finding("inconclusive", "Sandbox scanning is not configured.")], graph: empty, screenshot: null };
  }
  try {
    const submit = await fetch("https://urlscan.io/api/v1/scan/", {
      method: "POST",
      headers: { "API-Key": process.env.URLSCAN_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({ url: u.toString(), visibility: "unlisted" }),
      signal: AbortSignal.timeout(6000),
    });
    if (!submit.ok) throw new Error(`submit HTTP ${submit.status}`);
    const { uuid } = (await submit.json()) as { uuid: string };

    // Results usually land in 10–25s.
    const deadline = Date.now() + 30_000;
    let result: UrlscanResult | null = null;
    await new Promise((r) => setTimeout(r, 8000));
    while (Date.now() < deadline) {
      const res = await fetch(`https://urlscan.io/api/v1/result/${uuid}/`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        result = (await res.json()) as UrlscanResult;
        break;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    if (!result) {
      return { summary: "Sandbox scan didn't finish in time.", findings: [finding("inconclusive", "The remote browser didn't return a result within 30s.")], graph: empty, screenshot: null };
    }
    const overall = result.verdicts?.overall ?? {};
    const findings: Finding[] = [];
    if (overall.malicious) findings.push(finding("sandbox_malicious", `urlscan.io classifies the page as malicious${overall.tags?.length ? ` (${overall.tags.join(", ")})` : ""}.`));
    if (overall.brands?.length) findings.push(finding("sandbox_brand_phish", `The page imitates ${overall.brands.join(", ")}.`));
    const finalHost = result.page?.domain ? normalizeHost(result.page.domain) : null;
    if (findings.length === 0) findings.push(finding("neutral", `Page loaded on ${finalHost ?? "unknown host"}; no malicious verdict.`, "Sandbox: no verdict"));
    const screenshot = `https://urlscan.io/screenshots/${uuid}.png`;
    return {
      summary: `Rendered in a remote sandbox: final page on ${finalHost ?? "?"}${result.page?.country ? ` (${result.page.country})` : ""}.`,
      findings,
      graph: { nodes: [{ id: urlNodeId(u.toString()), label: `link · ${normalizeHost(u.hostname)}`, kind: "url", suspicious: !!overall.malicious || undefined }], edges: [] },
      screenshot,
    };
  } catch (err) {
    return { summary: "Sandbox scan failed.", findings: [finding("inconclusive", `Sandbox error: ${(err as Error).message}`)], graph: empty, screenshot: null };
  }
}

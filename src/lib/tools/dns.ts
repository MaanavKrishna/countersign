import { promises as dns } from "node:dns";
import { registrableDomain } from "../domain";
import { finding } from "../scoring";
import type { Finding, ToolOutput } from "../types";
import { domainNodeId } from "./graphIds";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("DNS timeout")), ms))]);
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await withTimeout(p, 4000);
  } catch {
    return null;
  }
}

export async function dnsCheck(rawDomain: string, asSender: boolean): Promise<ToolOutput> {
  const domain = registrableDomain(rawDomain);
  const [mx, txt, dmarc, a] = await Promise.all([
    safe(dns.resolveMx(domain)),
    safe(dns.resolveTxt(domain)),
    safe(dns.resolveTxt(`_dmarc.${domain}`)),
    safe(dns.resolve4(domain)),
  ]);
  const flat = (rows: string[][] | null) => (rows ?? []).map((r) => r.join(""));
  const spf = flat(txt).find((t) => t.toLowerCase().startsWith("v=spf1")) ?? null;
  const dmarcRec = flat(dmarc).find((t) => t.toLowerCase().startsWith("v=dmarc1")) ?? null;
  const hasMx = !!mx && mx.length > 0;
  const resolves = !!a && a.length > 0;

  const findings: Finding[] = [];
  const parts = [
    hasMx ? `MX ✓ (${mx!.length})` : "no MX",
    spf ? "SPF ✓" : "no SPF",
    dmarcRec ? `DMARC ✓ (${/p=(\w+)/i.exec(dmarcRec)?.[1] ?? "?"})` : "no DMARC",
    resolves ? "web ✓" : "no A record",
  ].join(" · ");

  if (asSender && !hasMx) findings.push(finding("no_mx_record", `${domain} sends email but has no MX record to receive replies.`));
  if (asSender && !dmarcRec) findings.push(finding("no_dmarc_record", `${domain} publishes no DMARC policy, so anyone can spoof it.`));
  if (findings.length === 0) findings.push(finding("neutral", `${domain}: ${parts}.`, "DNS records present"));

  return {
    summary: `${domain}: ${parts}`,
    findings,
    graph: { nodes: [{ id: domainNodeId(domain), label: domain, kind: "domain" }], edges: [] },
  };
}

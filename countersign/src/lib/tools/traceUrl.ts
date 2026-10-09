import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import { brandForDomain } from "../brands";
import { isIpAddress, normalizeHost, registrableDomain, tld } from "../domain";
import { finding } from "../scoring";
import type { Finding, GraphDelta, ToolOutput } from "../types";
import { EXHIBIT_ID, domainNodeId, urlNodeId } from "./graphIds";

export const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at",
  "rb.gy", "t.ly", "tiny.cc", "s.id", "qrco.de", "bl.ink", "short.io", "shorturl.gg", "v.gd", "lnkd.in", "trib.al",
]);

export const RISKY_TLDS = new Set([
  "top", "xyz", "icu", "cfd", "sbs", "buzz", "click", "link", "rest", "monster", "tk", "ml", "ga", "cf", "gq",
  "zip", "mov", "lol", "cyou", "bond", "quest", "support", "su",
]);

const MAX_HOPS = 5;

/** True for loopback, private, link-local, CGNAT, metadata and other non-public ranges. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

async function hostIsPublic(host: string): Promise<boolean> {
  const bare = host.replace(/^\[|\]$/g, "");
  if (isIP(bare)) return !isPrivateAddress(bare);
  try {
    const addrs = await dns.lookup(bare, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

export function parseUrl(raw: string): URL | null {
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** Static structure checks — no network. */
export function structuralFindings(u: URL): Finding[] {
  const host = normalizeHost(u.hostname);
  const out: Finding[] = [];
  if (u.username || u.password)
    out.push(finding("url_at_trick", `Everything before "@" is ignored by the browser — this link really goes to ${host}.`));
  if (isIpAddress(host.replace(/^\[|\]$/g, ""))) out.push(finding("ip_host_url", `The link goes straight to ${host}, with no domain name.`));
  if (SHORTENERS.has(host)) out.push(finding("url_shortener", `${host} hides the real destination.`));
  if (RISKY_TLDS.has(tld(host))) out.push(finding("risky_tld", `.${tld(host)} domains are cheap and heavily used for phishing.`));
  const sub = host.split(".").length - registrableDomain(host).split(".").length;
  if (sub >= 3) out.push(finding("deep_subdomains", `${host} stacks ${sub} subdomains in front of ${registrableDomain(host)}.`));
  return out;
}

type Hop = { url: string; status: number | null };

async function followRedirects(start: URL): Promise<{ hops: Hop[]; blocked: string | null; error: string | null }> {
  const hops: Hop[] = [];
  let current: URL = start;
  for (let i = 0; i <= MAX_HOPS; i++) {
    if (!(await hostIsPublic(current.hostname))) {
      return { hops, blocked: `${current.hostname} resolves to a private or unknown address — not contacted`, error: null };
    }
    let res: Response;
    try {
      res = await fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(4000), headers: { "user-agent": "Mozilla/5.0 (Countersign link inspector)" } });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(current, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(4000), headers: { "user-agent": "Mozilla/5.0 (Countersign link inspector)" } });
        await res.body?.cancel();
      }
    } catch (err) {
      hops.push({ url: current.toString(), status: null });
      return { hops, blocked: null, error: (err as Error).name === "TimeoutError" ? "timed out" : "unreachable" };
    }
    hops.push({ url: current.toString(), status: res.status });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = (() => {
        try {
          return new URL(loc, current);
        } catch {
          return null;
        }
      })();
      if (!next || (next.protocol !== "http:" && next.protocol !== "https:")) break;
      current = next;
      continue;
    }
    break;
  }
  return { hops, blocked: null, error: null };
}

export async function traceUrl(raw: string): Promise<ToolOutput & { finalHost: string | null }> {
  const u = parseUrl(raw);
  const graph: GraphDelta = { nodes: [], edges: [] };
  if (!u) {
    return { summary: `"${raw}" isn't a web link.`, findings: [finding("inconclusive", "Not an http(s) URL.")], graph, finalHost: null };
  }
  const startHost = normalizeHost(u.hostname);
  const findings = structuralFindings(u);
  const startId = urlNodeId(u.toString());
  graph.nodes.push({ id: startId, label: `link · ${startHost}${u.pathname.length > 1 ? u.pathname.slice(0, 18) : ""}`, kind: "url", suspicious: findings.length > 0 || undefined });
  graph.edges.push({ source: EXHIBIT_ID, target: startId, label: "links to" });

  const { hops, blocked, error } = await followRedirects(u);
  let prev = startId;
  for (const hop of hops.slice(1)) {
    const hu = new URL(hop.url);
    const host = normalizeHost(hu.hostname);
    const ip = isIpAddress(host.replace(/^\[|\]$/g, ""));
    const id = urlNodeId(hop.url);
    graph.nodes.push({ id, label: `${host}${hu.pathname.length > 1 ? hu.pathname.slice(0, 16) : ""}`, kind: ip ? "ip" : "url", suspicious: ip || undefined });
    graph.edges.push({ source: prev, target: id, label: "redirects", deceptive: ip || undefined });
    prev = id;
  }

  const finalUrl = hops.length ? new URL(hops[hops.length - 1].url) : u;
  const finalHost = normalizeHost(finalUrl.hostname);
  if (hops.length > 1) {
    const finalIsIp = isIpAddress(finalHost.replace(/^\[|\]$/g, ""));
    if (finalIsIp) findings.push(finding("redirect_to_ip", `${startHost} redirects to the bare IP address ${finalHost}.`));
    else if (registrableDomain(finalHost) !== registrableDomain(startHost) && !SHORTENERS.has(startHost)) {
      findings.push(finding("redirect_offdomain", `${startHost} silently forwards to ${finalHost}.`));
    }
    findings.push(...structuralFindings(finalUrl).filter((f) => f.signalId !== "url_shortener"));
    graph.nodes.push({ id: domainNodeId(registrableDomain(finalHost)), label: registrableDomain(finalHost), kind: finalIsIp ? "ip" : "domain" });
    graph.edges.push({ source: prev, target: domainNodeId(registrableDomain(finalHost)) });
  }

  const brand = brandForDomain(finalHost);
  const chain = hops.map((h) => `${normalizeHost(new URL(h.url).hostname)}${h.status ? ` (${h.status})` : ""}`).join(" → ");
  const notes = [blocked, error ? `stopped: ${error}` : null].filter(Boolean).join("; ");
  if (findings.length === 0) {
    findings.push(finding("neutral", `${chain || startHost}${brand ? ` — stays on ${brand.name}'s own site` : ""}.`, "Link structure looks normal"));
  }
  return {
    summary: `${chain || startHost}${notes ? ` — ${notes}` : ""}.${blocked ? "" : " Only headers were requested; the page was never opened."}`,
    findings,
    graph,
    finalHost,
  };
}

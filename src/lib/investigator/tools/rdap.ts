import { brandForDomain } from "@/lib/core/brands";
import { registrableDomain } from "@/lib/core/domain";
import { finding } from "@/lib/core/scoring";
import { SHORTENERS } from "@/lib/investigator/tools/traceUrl";

// Shared infrastructure is old by definition; its age says nothing about the sender.
const INFRASTRUCTURE = new Set([...SHORTENERS, "gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "proton.me", "protonmail.com", "gmx.com", "mail.ru", "yandex.com", "github.io", "netlify.app", "vercel.app", "pages.dev", "web.app", "firebaseapp.com", "blogspot.com", "wixsite.com", "weebly.com", "000webhostapp.com", "sites.google.com", "forms.gle", "docs.google.com"]);
import type { Finding } from "@/lib/core/types";
import type { ToolOutput } from "@/lib/investigator/types";
import { domainNodeId, factNodeId } from "@/lib/investigator/tools/graphIds";

type RdapEntity = { roles?: string[]; vcardArray?: [string, [string, object, string, string][]] };
type RdapResponse = {
  events?: { eventAction: string; eventDate: string }[];
  entities?: RdapEntity[];
};

const DAY = 86_400_000;
const UA = { "user-agent": "Countersign/1.0 (fraud investigation; hackathon project)", accept: "application/rdap+json" };

// IANA's RDAP bootstrap maps each TLD to its registry's RDAP server. Querying
// the registry directly avoids depending on a third-party redirector.
let bootstrap: Promise<Map<string, string>> | null = null;
function rdapBaseFor(tld: string): Promise<string | null> {
  bootstrap ??= fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(5000) })
    .then((r) => r.json() as Promise<{ services: [string[], string[]][] }>)
    .then((j) => {
      const m = new Map<string, string>();
      for (const [tlds, urls] of j.services) for (const t of tlds) m.set(t, urls.find((u) => u.startsWith("https")) ?? urls[0]);
      return m;
    })
    .catch(() => {
      bootstrap = null;
      return new Map<string, string>();
    });
  return bootstrap.then((m) => m.get(tld) ?? null);
}

async function fetchRdap(domain: string): Promise<Response> {
  const base = await rdapBaseFor(domain.split(".").pop()!);
  const url = base ? `${base.replace(/\/?$/, "/")}domain/${encodeURIComponent(domain)}` : `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  return fetch(url, { headers: UA, signal: AbortSignal.timeout(6000), redirect: "follow" });
}

function registrarName(entities: RdapEntity[] | undefined): string | null {
  const reg = entities?.find((e) => e.roles?.includes("registrar"));
  const fn = reg?.vcardArray?.[1]?.find((f) => f[0] === "fn");
  return fn ? String(fn[3]) : null;
}

export function describeAge(days: number): string {
  if (days < 1) return "today";
  if (days < 60) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 730) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

export function ageFindings(domain: string, days: number, registrar: string | null): Finding[] {
  const who = registrar ? ` via ${registrar}` : "";
  const when = describeAge(days);
  if (days < 7) return [finding("domain_age_lt_7d", `${domain} was registered ${when}${who}.`)];
  if (days < 30) return [finding("domain_age_lt_30d", `${domain} was registered ${when}${who}.`)];
  if (days < 180) return [finding("domain_age_lt_180d", `${domain} was registered ${when}${who}.`)];
  if (days > 5 * 365)
    return [finding("trust_domain_established", `${domain} has existed since ${when}${who}.`)];
  return [finding("neutral", `${domain} was registered ${when}${who}.`, "Domain age unremarkable")];
}

export async function rdapLookup(rawDomain: string, now = Date.now()): Promise<ToolOutput> {
  const domain = registrableDomain(rawDomain);
  const dn = domainNodeId(domain);
  try {
    const res = await fetchRdap(domain);
    if (res.status === 404) {
      return {
        summary: `No registration record found for ${domain}.`,
        findings: [finding("domain_not_registered", `The registry has no record of ${domain}: it was never registered, or it has already been taken down.`)],
        graph: { nodes: [{ id: dn, label: domain, kind: "domain" }], edges: [] },
      };
    }
    if (!res.ok) throw new Error(`RDAP HTTP ${res.status}`);
    const data = (await res.json()) as RdapResponse;
    const reg = data.events?.find((e) => e.eventAction === "registration");
    const registrar = registrarName(data.entities);
    if (!reg) {
      return {
        summary: `${domain} has no registration date in RDAP.`,
        findings: [finding("inconclusive", `RDAP returned no registration date for ${domain}.`)],
        graph: { nodes: [{ id: dn, label: domain, kind: "domain" }], edges: [] },
      };
    }
    const days = Math.max(0, Math.floor((now - Date.parse(reg.eventDate)) / DAY));
    const findings = ageFindings(domain, days, registrar);
    // The brand's own domains being old is expected — not extra evidence of trust
    // beyond what lookalike_check already established.
    const young = days < 180;
    const factId = factNodeId(domain, "age");
    return {
      summary: `${domain} registered ${describeAge(days)}${registrar ? ` (${registrar})` : ""}.`,
      findings: brandForDomain(domain) || INFRASTRUCTURE.has(domain) ? findings.filter((f) => f.kind !== "trust") : findings,
      // Only a young domain earns a node in the evidence graph.
      graph: young
        ? {
            nodes: [
              { id: dn, label: domain, kind: "domain", suspicious: true },
              { id: factId, label: `registered ${describeAge(days)}`, kind: "fact", suspicious: true },
            ],
            edges: [{ source: dn, target: factId, deceptive: true }],
          }
        : { nodes: [], edges: [] },
    };
  } catch (err) {
    return {
      summary: `Registration lookup for ${domain} failed.`,
      findings: [finding("inconclusive", `RDAP lookup failed: ${(err as Error).message}`)],
      graph: { nodes: [{ id: dn, label: domain, kind: "domain" }], edges: [] },
    };
  }
}

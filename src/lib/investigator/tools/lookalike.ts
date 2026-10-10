import { domainToUnicode } from "node:url";
import { BRANDS, brandForDomain, type Brand } from "@/lib/core/brands";
import { normalizeHost, registrableDomain } from "@/lib/core/domain";
import { finding } from "@/lib/core/scoring";
import type { Finding } from "@/lib/core/types";
import type { ToolOutput } from "@/lib/investigator/types";
import { brandNodeId, domainNodeId } from "@/lib/investigator/tools/graphIds";

// Unicode characters that render like Latin letters (a practical subset of
// Unicode's confusables table covering the homoglyphs used in phishing).
const CONFUSABLES: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", ԁ: "d", ӏ: "l", һ: "h",
  ԛ: "q", ԝ: "w", ɡ: "g", ɩ: "i", ο: "o", ν: "v", α: "a", ε: "e", κ: "k", τ: "t", ρ: "p",
  á: "a", à: "a", â: "a", ä: "a", ã: "a", å: "a", é: "e", è: "e", ê: "e", ë: "e", í: "i", ì: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ú: "u", ù: "u", û: "u", ü: "u", ý: "y", ç: "c", ñ: "n",
};

// ASCII substitutions that read as letters at a glance.
const ASCII_SKELETON: [RegExp, string][] = [
  [/rn/g, "m"],
  [/vv/g, "w"],
  [/0/g, "o"],
  [/1/g, "l"],
  [/3/g, "e"],
  [/5/g, "s"],
  [/\$/g, "s"],
];

export function skeleton(label: string): string {
  let s = [...label.toLowerCase()].map((ch) => CONFUSABLES[ch] ?? ch).join("");
  for (const [re, rep] of ASCII_SKELETON) s = s.replace(re, rep);
  return s;
}

/** Optimal-string-alignment Damerau-Levenshtein distance. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function labelOf(domain: string): string {
  // "paypa1-secure.com" → "paypa1-secure"; "example.co.uk" → "example"
  return registrableDomain(domain).split(".")[0];
}

function tokenAppears(label: string, token: string): boolean {
  // Short tokens ("ups", "att", "irs") must be a whole hyphen-delimited word;
  // longer ones may be embedded ("paypalsecure").
  if (token.length <= 4) return label.split("-").includes(token);
  return label.includes(token);
}

export type LookalikeResult = {
  brand: Brand | null;
  kind: "exact" | "homoglyph" | "lookalike" | "subdomain" | "token" | "none";
  distance?: number;
  unicode?: string;
};

export function classifyDomain(rawHost: string): LookalikeResult {
  const host = normalizeHost(rawHost);
  const own = brandForDomain(host);
  if (own) return { brand: own, kind: "exact" };

  const unicodeHost = host.includes("xn--") ? domainToUnicode(host) : host;
  const label = labelOf(unicodeHost);
  const skel = skeleton(label);
  const hasNonAscii = /[^\x00-\x7f]/.test(unicodeHost);

  // 1. Brand hidden in front of the real domain: paypal.com.secure-check.ru,
  //    usps.com-redelivery.top, amazon.verify-account.net
  const reg = registrableDomain(host);
  const subLabels = host.slice(0, Math.max(0, host.length - reg.length)).split(".").filter(Boolean);
  for (const b of BRANDS) {
    for (const bd of b.domains) {
      const bl = bd.split(".")[0];
      if (
        (host !== bd && host.startsWith(`${bd}.`)) ||
        host.includes(`.${bd}.`) ||
        host.startsWith(`${bd}-`) ||
        subLabels.some((l) => l === bl || (bl.length >= 5 && skeleton(l) === bl))
      ) {
        return { brand: b, kind: "subdomain" };
      }
    }
  }

  // 2. Homoglyph / skeleton / edit-distance lookalikes of a brand label
  let best: { brand: Brand; dist: number } | null = null;
  for (const b of BRANDS) {
    for (const bd of b.domains) {
      const bl = bd.split(".")[0];
      if (bl.length < 4) continue;
      if (skel === bl && label !== bl) {
        return { brand: b, kind: hasNonAscii ? "homoglyph" : "lookalike", distance: 0, unicode: hasNonAscii ? unicodeHost : undefined };
      }
      const dist = editDistance(skel, bl);
      const allowed = bl.length >= 9 ? 2 : bl.length >= 5 ? 1 : 0;
      if (dist > 0 && dist <= allowed && (!best || dist < best.dist)) best = { brand: b, dist };
    }
  }
  if (best) return { brand: best.brand, kind: hasNonAscii ? "homoglyph" : "lookalike", distance: best.dist, unicode: hasNonAscii ? unicodeHost : undefined };

  // 3. Brand token inside an unrelated domain: paypal-secure-login.com
  for (const b of BRANDS) {
    if (tokenAppears(skel, b.token)) {
      // "paypa1-secure": the brand only appears after undoing a character swap.
      const disguised = !tokenAppears(label.toLowerCase(), b.token);
      return { brand: b, kind: disguised ? (hasNonAscii ? "homoglyph" : "lookalike") : "token", distance: disguised ? 0 : undefined, unicode: hasNonAscii ? unicodeHost : undefined };
    }
  }

  if (hasNonAscii) return { brand: null, kind: "none", unicode: unicodeHost };
  return { brand: null, kind: "none" };
}

export function lookalikeCheck(domain: string): ToolOutput {
  const host = normalizeHost(domain);
  const r = classifyDomain(host);
  const findings: Finding[] = [];
  const dn = domainNodeId(host);
  const graph: ToolOutput["graph"] = { nodes: [{ id: dn, label: host, kind: "domain" }], edges: [] };

  if (r.kind === "exact" && r.brand) {
    findings.push(finding("neutral", `${host} belongs to ${r.brand.name}.`, `Official ${r.brand.name} domain`));
    graph.nodes.push({ id: brandNodeId(r.brand.name), label: `${r.brand.name} (official)`, kind: "brand" });
    graph.edges.push({ source: dn, target: brandNodeId(r.brand.name), label: "owned by" });
    return { summary: `${host} is an official ${r.brand.name} domain.`, findings, graph };
  }
  if (r.kind === "none" || !r.brand) {
    findings.push(finding("neutral", `${host} doesn't resemble any of ${BRANDS.length} commonly impersonated brands.`, "No brand lookalike"));
    return { summary: `${host} does not imitate a known brand.`, findings, graph };
  }

  const real = r.brand.domains[0];
  graph.nodes[0].suspicious = true;
  graph.nodes.push({ id: brandNodeId(r.brand.name), label: `${r.brand.name} · ${real}`, kind: "brand" });
  const edge = { source: dn, target: brandNodeId(r.brand.name), deceptive: true } as const;

  switch (r.kind) {
    case "homoglyph":
      findings.push(finding("homoglyph_domain", `${host} renders as "${r.unicode}" — characters from another alphabet disguised to look like ${real}.`));
      graph.edges.push({ ...edge, label: "homoglyph" });
      break;
    case "lookalike":
      findings.push(finding("lookalike_brand_domain", `"${labelOf(host)}" is ${r.distance === 0 ? "a character-swap" : `${r.distance} edit${r.distance === 1 ? "" : "s"}`} away from ${real}.`));
      graph.edges.push({ ...edge, label: r.distance === 0 ? "lookalike · character swap" : `lookalike · ${r.distance} edit${r.distance === 1 ? "" : "s"}` });
      break;
    case "subdomain":
      findings.push(finding("brand_in_subdomain", `${host} starts with "${real}" but the real owner is ${registrableDomain(host)}.`));
      graph.edges.push({ ...edge, label: "brand in subdomain" });
      break;
    case "token":
      findings.push(finding("brand_token_unrelated_domain", `${host} contains "${r.brand.token}" but isn't owned by ${r.brand.name}.`));
      graph.edges.push({ ...edge, label: "borrows brand name" });
      break;
  }
  return { summary: `${host} imitates ${r.brand.name} (${real}).`, findings, graph };
}

import { brandByName, brandForDomain } from "@/lib/core/brands";
import { hostFromUrl, registrableDomain } from "@/lib/core/domain";
import { finding } from "@/lib/core/scoring";
import type { Finding } from "@/lib/core/types";

// Impersonation fraud, by definition: someone claims to be a person or
// organization you trust AND asks for something only that party should get.
// Each half alone is common in genuine mail; together they are the attack.

const CLAIMS = new Set([
  "tactic_authority", "tactic_relationship", "brand_mismatch_sender", "freemail_claims_brand",
  "lookalike_brand_domain", "homoglyph_domain", "brand_in_subdomain", "brand_token_unrelated_domain",
]);
const ASKS = new Set(["tactic_payment", "tactic_credentials", "tactic_remote_access"]);
const ASK_WORDS: Record<string, string> = {
  tactic_payment: "money",
  tactic_credentials: "codes or account details",
  tactic_remote_access: "access to your device",
};

/** Other ways the message lets you respond: a phone number, or replies that go elsewhere. */
export type OtherChannels = { phones: number; replyElsewhere: boolean };

export function impersonationAsk(findings: Finding[], claimedBrands: string[], channels?: OtherChannels): Finding[] {
  // A claim the infrastructure corroborates isn't impersonation: the brand authenticated the
  // mail, or the brand's own site is the ONLY way to respond. A phone number or a reply address
  // elsewhere reopens it (callback scams link to the real site and ask you to call).
  if (findings.some((f) => f.signalId === "trust_auth_aligned")) return [];
  const onlyBrandLinks = findings.some((f) => f.signalId === "trust_links_on_brand") && channels && channels.phones === 0 && !channels.replyElsewhere;
  if (onlyBrandLinks) return [];
  const claim = findings.find((f) => CLAIMS.has(f.signalId)) ?? null;
  const ask = findings.find((f) => ASKS.has(f.signalId));
  if (!ask || (!claim && claimedBrands.length === 0)) return [];
  const who = claim ? claim.label.toLowerCase() : `claims to be ${claimedBrands[0]}`;
  return [finding("impersonation_with_ask", `It poses as someone you trust (${who}) and asks for ${ASK_WORDS[ask.signalId]}: ${ask.detail}`)];
}

/** The message says it's from a brand, and links to a domain that carries that brand's name but
 *  isn't one of the brand's own: impersonation by construction (e.g. "Amazon" → amazon-returns-dropoff.com). */
export function claimedBrandForeignLink(urls: string[], claimedBrands: string[]): Finding[] {
  for (const name of claimedBrands) {
    const brand = brandByName(name);
    if (!brand) continue;
    for (const url of urls) {
      const host = hostFromUrl(url);
      if (!host || brandForDomain(host)) continue;
      const reg = registrableDomain(host);
      const label = reg.split(".")[0];
      // The brand name must be a whole hyphen-separated word ("amazon-returns", not "citizensbank"),
      // and "<brand>.<any country domain>" is the brand's own (amazon.fr).
      if (label === brand.token) continue;
      if (label.split("-").includes(brand.token)) {
        return [finding("claimed_brand_foreign_link", `It says it's from ${brand.name}, but the link goes to ${reg}, which ${brand.name} doesn't own.`)];
      }
    }
  }
  return [];
}

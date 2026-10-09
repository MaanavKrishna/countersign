import { finding } from "./scoring";
import type { Finding } from "./types";

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

export function impersonationAsk(findings: Finding[], claimedBrands: string[]): Finding[] {
  if (findings.some((f) => f.signalId === "trust_auth_aligned")) return [];
  const claim = findings.find((f) => CLAIMS.has(f.signalId)) ?? null;
  const ask = findings.find((f) => ASKS.has(f.signalId));
  if (!ask || (!claim && claimedBrands.length === 0)) return [];
  const who = claim ? claim.label.toLowerCase() : `claims to be ${claimedBrands[0]}`;
  return [finding("impersonation_with_ask", `It poses as someone you trust (${who}) and asks for ${ASK_WORDS[ask.signalId]}: ${ask.detail}`)];
}

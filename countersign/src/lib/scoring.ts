import type { Band, Finding } from "./types";

// The scoring model. The AI gathers evidence; this table — not the model —
// decides how much each piece of evidence counts. Weights are probabilities
// that the signal alone indicates fraud, combined with a noisy-OR.

type Signal = { weight: number; label: string; kind: "risk" | "trust" | "neutral" };

export const SIGNALS: Record<string, Signal> = {
  // Domain registration
  domain_age_lt_7d: { weight: 0.6, label: "Domain registered this week", kind: "risk" },
  domain_age_lt_30d: { weight: 0.5, label: "Domain registered this month", kind: "risk" },
  domain_age_lt_180d: { weight: 0.2, label: "Domain under 6 months old", kind: "risk" },
  domain_not_registered: { weight: 0.3, label: "Domain has no registration record", kind: "risk" },
  // Lookalikes and brand misuse
  lookalike_brand_domain: { weight: 0.7, label: "Lookalike of a brand domain", kind: "risk" },
  homoglyph_domain: { weight: 0.7, label: "Disguised characters in domain", kind: "risk" },
  brand_in_subdomain: { weight: 0.55, label: "Brand name hidden in a subdomain", kind: "risk" },
  brand_token_unrelated_domain: { weight: 0.45, label: "Brand name inside an unrelated domain", kind: "risk" },
  brand_mismatch_sender: { weight: 0.5, label: "Claims a brand it isn't sent from", kind: "risk" },
  freemail_claims_brand: { weight: 0.45, label: "Free webmail posing as an organization", kind: "risk" },
  // Email authentication
  spf_fail: { weight: 0.3, label: "SPF check failed", kind: "risk" },
  dkim_fail: { weight: 0.3, label: "DKIM signature failed", kind: "risk" },
  dmarc_fail: { weight: 0.45, label: "DMARC check failed", kind: "risk" },
  reply_to_mismatch: { weight: 0.35, label: "Replies go somewhere else", kind: "risk" },
  return_path_mismatch: { weight: 0.15, label: "Bounce address doesn't match sender", kind: "risk" },
  no_mx_record: { weight: 0.15, label: "Sender domain can't receive mail", kind: "risk" },
  no_dmarc_record: { weight: 0.1, label: "Sender domain has no DMARC policy", kind: "risk" },
  // Links
  url_shortener: { weight: 0.15, label: "Link hidden behind a shortener", kind: "risk" },
  ip_host_url: { weight: 0.4, label: "Link points to a raw IP address", kind: "risk" },
  url_at_trick: { weight: 0.4, label: "Link uses an @ to disguise its target", kind: "risk" },
  deep_subdomains: { weight: 0.15, label: "Unusually deep subdomain chain", kind: "risk" },
  risky_tld: { weight: 0.15, label: "Domain on a TLD favoured by scammers", kind: "risk" },
  redirect_offdomain: { weight: 0.2, label: "Link redirects to a different site", kind: "risk" },
  redirect_to_ip: { weight: 0.4, label: "Link redirects to a raw IP address", kind: "risk" },
  sandbox_malicious: { weight: 0.8, label: "Sandbox flagged the page as malicious", kind: "risk" },
  sandbox_brand_phish: { weight: 0.5, label: "Page imitates a brand", kind: "risk" },
  // Manipulation tactics (from the message text)
  tactic_urgency: { weight: 0.15, label: "Artificial urgency", kind: "risk" },
  tactic_threat: { weight: 0.15, label: "Threat or fear", kind: "risk" },
  tactic_authority: { weight: 0.15, label: "Claimed authority", kind: "risk" },
  tactic_secrecy: { weight: 0.25, label: "Demand for secrecy", kind: "risk" },
  tactic_reward: { weight: 0.2, label: "Too-good-to-be-true reward", kind: "risk" },
  tactic_payment: { weight: 0.45, label: "Untraceable payment requested", kind: "risk" },
  tactic_credentials: { weight: 0.4, label: "Asks for credentials or codes", kind: "risk" },
  tactic_remote_access: { weight: 0.45, label: "Asks to install or grant remote access", kind: "risk" },
  tactic_relationship: { weight: 0.25, label: "Claims a personal relationship", kind: "risk" },
  tactic_emotional: { weight: 0.1, label: "Emotional pressure", kind: "risk" },
  // Trust — reduce risk multiplicatively
  trust_auth_aligned: { weight: 0.45, label: "Authenticated by the brand's own domain", kind: "trust" },
  trust_links_on_brand: { weight: 0.3, label: "All links stay on the brand's own domains", kind: "trust" },
  trust_domain_established: { weight: 0.25, label: "Long-established domain", kind: "trust" },
  // Neutral
  neutral: { weight: 0, label: "Checked", kind: "neutral" },
  inconclusive: { weight: 0, label: "Lookup inconclusive", kind: "neutral" },
};

export const TACTIC_SIGNALS = Object.keys(SIGNALS).filter((k) => k.startsWith("tactic_"));

export function finding(signalId: string, detail: string, label?: string): Finding {
  const s = SIGNALS[signalId] ?? SIGNALS.neutral;
  return { signalId, label: label ?? s.label, detail, weight: s.weight, kind: s.kind };
}

export function bandFor(risk: number): Band {
  if (risk >= 0.7) return "forgery";
  if (risk >= 0.35) return "unverified";
  return "countersigned";
}

/**
 * Noisy-OR over distinct risk signals, then discounted by trust signals.
 * Each signalId counts once (its strongest finding) so ten shortened links
 * don't count as ten independent pieces of evidence.
 */
export function score(findings: Finding[]): { risk: number; band: Band } {
  const strongest = new Map<string, Finding>();
  for (const f of findings) {
    const prev = strongest.get(f.signalId);
    if (!prev || f.weight > prev.weight) strongest.set(f.signalId, f);
  }
  let notRisk = 1;
  let trust = 1;
  for (const f of strongest.values()) {
    if (f.kind === "risk") notRisk *= 1 - f.weight;
    else if (f.kind === "trust") trust *= 1 - f.weight;
  }
  const risk = Math.round((1 - notRisk) * trust * 1000) / 1000;
  return { risk, band: bandFor(risk) };
}

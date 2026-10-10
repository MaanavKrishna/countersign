import { brandByName, brandForDomain, type Brand } from "@/lib/core/brands";
import { registrableDomain } from "@/lib/core/domain";
import { finding } from "@/lib/core/scoring";
import type { Finding } from "@/lib/core/types";
import type { GraphDelta, Indicators, ToolOutput } from "@/lib/investigator/types";
import { EXHIBIT_ID, brandNodeId, domainNodeId, senderNodeId } from "@/lib/investigator/tools/graphIds";

const FREEMAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com", "outlook.com", "live.com", "aol.com",
  "icloud.com", "me.com", "proton.me", "protonmail.com", "gmx.com", "gmx.net", "mail.com", "mail.ru", "yandex.com",
  "zoho.com", "qq.com", "163.com",
]);

// Bulk senders whose bounce domains legitimately differ from the From domain.
const ESP_BOUNCE = [
  "amazonses.com", "sendgrid.net", "mailgun.org", "mcsv.net", "mandrillapp.com", "sparkpostmail.com",
  "exacttarget.com", "rsgsv.net", "mktomail.com", "bounces.google.com", "postmarkapp.com", "sendinblue.com",
  "brevo.com", "hubspotemail.net", "salesforce.com", "cmail19.com", "cmail20.com",
];

export type AuthResults = { spf: string | null; dkim: string | null; dmarc: string | null };

export function parseAuthResults(value: string | undefined): AuthResults {
  const v = (value ?? "").toLowerCase();
  const pick = (k: string) => new RegExp(`\\b${k}=([a-z]+)`).exec(v)?.[1] ?? null;
  return { spf: pick("spf"), dkim: pick("dkim"), dmarc: pick("dmarc") };
}

export function emailAuth(ind: Indicators): ToolOutput {
  const graph: GraphDelta = { nodes: [], edges: [] };
  if (!ind.headers) {
    return {
      summary: "No email headers were provided, so sender authentication can't be checked.",
      findings: [finding("inconclusive", "Paste the full original email (with headers) to check SPF, DKIM and DMARC.", "No headers to authenticate")],
      graph,
    };
  }

  const findings: Finding[] = [];
  const from = ind.senderDomain;
  const fromReg = from ? registrableDomain(from) : null;
  const auth = parseAuthResults(ind.headers["authentication-results"] ?? ind.headers["arc-authentication-results"]);

  if (from) {
    const sid = senderNodeId(from);
    graph.nodes.push({ id: sid, label: `sender · ${ind.displayName ? `"${ind.displayName}" ` : ""}@${from}`, kind: "sender" });
    graph.edges.push({ source: EXHIBIT_ID, target: sid, label: "from" });
    graph.nodes.push({ id: domainNodeId(fromReg!), label: fromReg!, kind: "domain" });
    graph.edges.push({ source: sid, target: domainNodeId(fromReg!) });
  }

  // SPF / DKIM / DMARC verdicts recorded by the receiving server.
  const bad = (r: string | null) => r !== null && ["fail", "softfail", "permerror"].includes(r);
  if (bad(auth.spf)) findings.push(finding("spf_fail", `Receiving server recorded spf=${auth.spf}: the sending server isn't authorized for ${from ?? "this domain"}.`));
  if (bad(auth.dkim)) findings.push(finding("dkim_fail", `dkim=${auth.dkim}: the message signature doesn't verify.`));
  if (auth.dmarc === "fail") findings.push(finding("dmarc_fail", `dmarc=fail: ${from ?? "the sender"} did not pass its own domain's policy.`));

  // Where replies and bounces really go.
  if (ind.replyToDomain && fromReg && registrableDomain(ind.replyToDomain) !== fromReg) {
    findings.push(finding("reply_to_mismatch", `Sent from ${fromReg}, but replies go to ${ind.replyToDomain}.`));
    const rid = senderNodeId(`reply-to:${ind.replyToDomain}`);
    graph.nodes.push({ id: rid, label: `reply-to · ${ind.replyToDomain}`, kind: "sender", suspicious: true });
    graph.edges.push({ source: EXHIBIT_ID, target: rid, label: "replies go to", deceptive: true });
  }
  if (ind.returnPathDomain && fromReg) {
    const rp = registrableDomain(ind.returnPathDomain);
    if (rp !== fromReg && !ESP_BOUNCE.some((e) => ind.returnPathDomain!.endsWith(e))) {
      findings.push(finding("return_path_mismatch", `Bounces go to ${ind.returnPathDomain}, not ${fromReg}.`));
    }
  }

  // Brand claims vs the actual sending domain.
  const claimed = ind.claimedBrands.map(brandByName).filter((b): b is Brand => b !== null);
  const senderBrand = from ? brandForDomain(from) : null;
  if (from && claimed.length > 0 && !senderBrand) {
    const b = claimed[0];
    if (FREEMAIL.has(fromReg!)) {
      findings.push(finding("freemail_claims_brand", `Claims to be ${b.name} but was sent from a free ${fromReg} account.`));
    } else {
      findings.push(finding("brand_mismatch_sender", `Claims to be ${b.name}, whose mail comes from ${b.domains[0]} — this came from ${fromReg}.`));
    }
    graph.nodes.push({ id: brandNodeId(b.name), label: `${b.name} · ${b.domains[0]}`, kind: "brand" });
    graph.edges.push({ source: EXHIBIT_ID, target: brandNodeId(b.name), label: "claims to be" });
    graph.edges.push({ source: domainNodeId(fromReg!), target: brandNodeId(b.name), label: "not owned by", deceptive: true });
  }

  // Strong trust: authenticated mail from the brand's own domain.
  if (senderBrand && auth.dmarc === "pass" && (auth.dkim === "pass" || auth.spf === "pass")) {
    findings.push(finding("trust_auth_aligned", `Authenticated (DMARC pass) as ${fromReg}, an official ${senderBrand.name} domain.`));
    graph.nodes.push({ id: brandNodeId(senderBrand.name), label: `${senderBrand.name} (official)`, kind: "brand" });
    if (fromReg) graph.edges.push({ source: domainNodeId(fromReg), target: brandNodeId(senderBrand.name), label: "authenticated" });
  }

  const verdicts = `spf=${auth.spf ?? "?"} dkim=${auth.dkim ?? "?"} dmarc=${auth.dmarc ?? "?"}`;
  if (findings.length === 0) findings.push(finding("neutral", `${verdicts}; sender and reply addresses line up.`, "Sender checks out"));
  return { summary: `${from ?? "unknown sender"} · ${verdicts}`, findings, graph };
}

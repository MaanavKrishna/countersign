import type { Message } from "agentboxd";
import type { InvestigationInput } from "../pipeline";
import { finding } from "../scoring";
import type { Finding } from "../types";
import { extractForwarded } from "./forwarded";

type Incoming = Pick<Message, "from" | "reply_to" | "subject" | "text" | "labels" | "ai">;

function authLine(labels: string[]): string | null {
  const pick = (k: string) => labels.find((l) => l.startsWith(`${k}-`))?.slice(k.length + 1) ?? null;
  const spf = pick("spf");
  const dkim = pick("dkim");
  const dmarc = pick("dmarc");
  if (!spf && !dkim && !dmarc) return null;
  return `Authentication-Results: agentboxd; ${[spf && `spf=${spf}`, dkim && `dkim=${dkim}`, dmarc && `dmarc=${dmarc}`].filter(Boolean).join("; ")}`;
}

export function toInvestigationInput(msg: Incoming): InvestigationInput {
  const body = msg.text ?? "";
  const fwd = extractForwarded(body);
  let text: string;
  if (fwd.isForward) {
    // The provider's auth labels describe the forwarder's mail, not the scam.
    text = fwd.original;
  } else {
    const headers = [`From: ${msg.from}`, msg.reply_to ? `Reply-To: ${msg.reply_to}` : null, `Subject: ${msg.subject ?? ""}`, authLine(msg.labels)].filter(Boolean);
    text = `${headers.join("\n")}\n\n${body}`;
  }

  // Content classifiers still apply to a forwarded scam's text.
  const extraFindings: Finding[] = [];
  const risk = msg.ai?.risk;
  if (risk && risk.phishing >= 0.5) {
    extraFindings.push(finding("provider_phishing_flag", `Agentboxd's mail screening rated this ${Math.round(risk.phishing * 100)}% likely phishing.`));
  }
  if (risk && risk.injection >= 0.5) {
    extraFindings.push(finding("ai_directed_instructions", `Agentboxd's screening detected a prompt-injection attempt (${Math.round(risk.injection * 100)}%).`));
  }
  return { text: text.slice(0, 20000), image: null, extraFindings };
}

import type { Message } from "agentboxd";
import { createLimiter } from "@/lib/server/ratelimit";
import { extractForwarded } from "./forwarded";

// Decides whether an inbound email gets investigated and answered. Keys on the
// message id from the signed payload, never on unsigned delivery headers.

type Withheld = { state: string; reason: string } | null | undefined;
type Incoming = Pick<Message, "id" | "from" | "subject" | "labels" | "text" | "headers" | "ai"> & { withheld?: Withheld };

const answered = new Set<string>();
const perSender = createLimiter({ limit: 10, windowMs: 60 * 60_000 });
const AUTO_SUBJECT = /\b(auto(matic)?[- ]?reply|out of (the )?office|undeliverable|delivery status notification|mail delivery failed)\b/i;

function header(msg: Incoming, name: string): string {
  const v = msg.headers?.[name] ?? msg.headers?.[name.toLowerCase()];
  return (Array.isArray(v) ? v.join(" ") : (v ?? "")).toLowerCase();
}

/** RFC 3834 auto-responder markers. A model's "looks automated" score is not used:
 *  forwarded notification emails look automated by nature. */
function isAutoReply(msg: Incoming): boolean {
  const auto = header(msg, "auto-submitted");
  if (auto && auto !== "no") return true;
  if (header(msg, "x-autoreply") || header(msg, "x-autorespond")) return true;
  if (/^(auto_reply|bulk|junk)$/.test(header(msg, "precedence").trim())) return true;
  return AUTO_SUBJECT.test(msg.subject ?? "");
}

export function shouldInvestigate(msg: Incoming): { ok: boolean; reason: string } {
  if (msg.labels.some((l) => l.startsWith("countersign:"))) return { ok: false, reason: "already answered" };
  if (answered.has(msg.id)) return { ok: false, reason: "duplicate" };
  if (isAutoReply(msg)) return { ok: false, reason: "auto-reply" };
  const forwarded = extractForwarded(msg.text ?? "").isForward;
  // A direct message from a sender that fails authentication may be spoofed;
  // replying would send our report to whoever was impersonated.
  if (!forwarded && msg.labels.some((l) => l === "dmarc-fail" || l === "spf-fail")) return { ok: false, reason: "unauthenticated sender" };
  if (!perSender.check(msg.from.toLowerCase()).ok) return { ok: false, reason: "sender limit" };
  answered.add(msg.id);
  if (answered.size > 10_000) answered.delete(answered.values().next().value!);
  return { ok: true, reason: "ok" };
}

/** The mail provider's own screen withheld the content as phishing: answer from that, honestly. */
export function heldNotice(msg: Incoming): { subject: string; text: string } | null {
  if (msg.withheld?.state !== "held") return null;
  const p = Math.round((msg.ai?.risk?.phishing ?? 0) * 100);
  const reason = msg.withheld.reason || "suspicious content";
  return {
    subject: `FORGERY (${Math.min(99, p)}% risk): blocked as ${reason} before we could open it`,
    text: [
      `The email you forwarded was blocked by our mail provider's security screen as ${reason}${p ? ` (${p}% likely)` : ""}, before Countersign could read it.`,
      "",
      "Treat it as a scam:",
      "  1. Don't click its links, reply, or call any number in it.",
      "  2. If it claims to be from a company you use, go to that company's app or website yourself.",
      "  3. Report it at reportfraud.ftc.gov (US) or your country's fraud line, then delete it.",
      "",
      "For a full evidence report, paste the message at https://countersign-self.vercel.app",
    ].join("\n"),
  };
}

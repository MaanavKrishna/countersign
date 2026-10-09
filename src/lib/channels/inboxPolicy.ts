import type { Message } from "agentboxd";
import { createLimiter } from "../ratelimit";
import { extractForwarded } from "./forwarded";

// Decides whether an inbound email gets investigated and answered. Keys on the
// message id from the signed payload, never on unsigned delivery headers.

type Incoming = Pick<Message, "id" | "from" | "subject" | "labels" | "text" | "ai">;

const answered = new Set<string>();
const perSender = createLimiter({ limit: 10, windowMs: 60 * 60_000 });
const AUTO_SUBJECT = /\b(auto(matic)?[- ]?reply|out of (the )?office|undeliverable|delivery status notification|mail delivery failed)\b/i;

export function shouldInvestigate(msg: Incoming): { ok: boolean; reason: string } {
  if (msg.labels.some((l) => l.startsWith("countersign:"))) return { ok: false, reason: "already answered" };
  if (answered.has(msg.id)) return { ok: false, reason: "duplicate" };
  if (AUTO_SUBJECT.test(msg.subject ?? "") || (msg.ai?.auto_reply ?? 0) >= 0.5) return { ok: false, reason: "auto-reply" };
  const forwarded = extractForwarded(msg.text ?? "").isForward;
  // A direct message from a sender that fails authentication may be spoofed;
  // replying would send our report to whoever was impersonated.
  if (!forwarded && msg.labels.some((l) => l === "dmarc-fail" || l === "spf-fail")) return { ok: false, reason: "unauthenticated sender" };
  if (!perSender.check(msg.from.toLowerCase()).ok) return { ok: false, reason: "sender limit" };
  answered.add(msg.id);
  if (answered.size > 10_000) answered.delete(answered.values().next().value!);
  return { ok: true, reason: "ok" };
}

import type { Tactic } from "../types";

export function alertText(claimed: string | null, tactics: Tactic[]): string {
  const ask = tactics.find((t) => t.label === "Untraceable payment" || t.label === "Credential request");
  if (!claimed && !ask) return "Countersign alert: I'm on a call that looks like a scam. Can you call me right now?";
  const what = ask ? ` asking for ${ask.label === "Credential request" ? "my security codes" : "money"} ("${ask.quote}")` : "";
  return `Countersign alert: someone claiming to be ${claimed ?? "someone I know"} is on the phone with me${what}. Can you call me right now?`;
}

export function smsLink(phone: string, body: string): string {
  // "?&body=" is accepted by both iOS and Android Messages.
  return `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;
}

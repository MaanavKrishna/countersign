// On-device Call Shield: phrase rules for the common phone-scam scripts, scored with the
// same signals as the AI path. Used when the user keeps the call on the phone, when the
// network is down, and when the AI service is unavailable. Less nuanced than the model,
// but nothing leaves the device.

import { TACTIC_LABELS } from "@/lib/core/tactics";
import { finding, score } from "@/lib/core/scoring";
import { stageFor } from "@/lib/shield/stage";
import type { ShieldAssessment } from "@/lib/shield/types";

type Category = keyof typeof TACTIC_LABELS;

const A = "['’]?"; // straight or curly apostrophe, or none (speech-to-text often drops it)

const RULES: Record<Category, RegExp> = {
  urgency: new RegExp(`\\b(right now|has to be today|today|immediately|hurry|as soon as possible|no time|only letting me use the phone|before (?:the|it)[^.?!\\n]{0,30}(?:goes through|expires|closes))`, "i"),
  threat: /\b(arrest(?:ed)?|warrant|lawsuit|suspended|frozen|deport(?:ed)?|police|jail|virus|hacked)\b/i,
  authority: /\b(this is (?:the )?[^.?!,\n]{0,40}?(?:department|team|office|agency|bank|support|irs|police|court)|lawyer|attorney|officer|irs|fbi|social security administration)\b/i,
  secrecy: new RegExp(`\\b(don${A}t tell|do not tell|keep (?:this|it) (?:between us|secret|quiet)|between you and me|don${A}t mention)`, "i"),
  reward: new RegExp(`\\b(you${A}ve won|you have won|prize|lottery|sweepstakes|guaranteed returns?|double your money)`, "i"),
  payment: /(?:\$\s?\d[\d,]*|\b(?:gift cards?|apple cards?|google play cards?|bitcoin|crypto(?:currency)?|wire (?:the )?(?:money|transfer)|western union|moneygram|zelle|cash app|venmo|bail|send (?:me )?(?:the )?money|(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) (?:hundred|thousand) dollars))/i,
  credentials: /\b((?:six|6|four|4)[- ]digit code|verification code|one[- ]time (?:code|password|passcode)|read (?:it|the code|them|the numbers) back|your (?:password|pin|social security number|account number|card number))/i,
  remote_access: /\b(anydesk|teamviewer|remote(?:ly)? (?:access|control|in)|fix it remotely|(?:download|install) (?:an? |the |our )?(?:\w+ )?(?:helper|support (?:app|tool)|remote|screen|access) ?\w*|share your screen|screen ?share)/i,
  // A caller who names themself is not a tactic; pressure to be recognised is.
  relationship: new RegExp(`\\b(guess who${A}s calling|don${A}t you recogni[sz]e (?:my voice|me)|it${A}s me,? your (?:grandson|granddaughter|son|daughter|nephew|niece|favou?rite))`, "i"),
  emotional: new RegExp(`\\b(i${A}m (?:so )?scared|i${A}m in trouble|freak out|please,? (?:hurry|help me)|i${A}m begging)`, "i"),
};

const ASKS: Category[] = ["payment", "credentials", "secrecy", "remote_access"];
const NOT_NAMES = new Set(["me", "okay", "ok", "not", "the", "just", "really", "so", "about", "time", "fine", "true"]);
const ORG = /(department|team|office|agency|bank|support|irs|police|court|services?)\b/i;

function claimedIdentity(t: string): string | null {
  const org = t.match(/\b(?:this is|i['’]?m calling from|calling from) (?:the )?([^.?!,\n]{2,50})/i);
  if (org && ORG.test(org[1])) return org[1].trim();
  for (const m of t.matchAll(new RegExp(`\\bit${A}s (?:me[.,!]?\\s*(?:it${A}s\\s+)?)?([A-Z][\\p{L}'-]+)`, "giu"))) {
    if (!NOT_NAMES.has(m[1].toLowerCase())) return m[1];
  }
  return null;
}

const ADVICE = {
  danger: "Don't pay or share any code. Ask for the countersign, or hang up and call back.",
  caution: "Slow down. Ask who they are, then call back on a number you already know.",
  calm: "Nothing unusual yet.",
} as const;

export function assessLocally(transcript: string): ShieldAssessment {
  const t = transcript.slice(-6000);
  const hits = (Object.keys(RULES) as Category[])
    .map((c) => {
      const m = RULES[c].exec(t);
      return m ? { category: c, quote: t.slice(m.index, m.index + m[0].length) } : null;
    })
    .filter((h): h is { category: Category; quote: string } => h !== null);

  const { risk } = score(hits.map((h) => finding(`tactic_${h.category}`, h.quote)));
  const stage = stageFor(risk);
  const identity = claimedIdentity(t);
  const asks = hits.some((h) => ASKS.includes(h.category));
  return {
    risk,
    stage,
    tactics: hits.map((h) => ({ label: TACTIC_LABELS[h.category], quote: h.quote })),
    claimedIdentity: identity,
    advice: ADVICE[stage],
    challengeNow: !!identity && asks && stage !== "calm",
    challengeTopic: null,
    source: "device",
  };
}

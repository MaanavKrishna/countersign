import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { finding } from "@/lib/core/scoring";
import { judgmentFinding } from "@/lib/investigator/judgment";
import type { Finding, Tactic } from "@/lib/core/types";
import { MODEL, UNTRUSTED_RULE, anthropic, untrusted } from "@/lib/ai/client";

import { CATEGORIES, TACTIC_LABELS } from "@/lib/core/tactics";

export { TACTIC_LABELS };

const TacticsSchema = z.object({
  messageText: z.string().describe("The message's full visible text. If the input is a screenshot, transcribe it."),
  language: z.string().describe("English name of the language the message is written in, e.g. 'English', 'Spanish', 'Hindi'"),
  overall: z.enum(["scam", "unsure", "legitimate"]).describe("Your overall judgment of the whole message"),
  overallWhy: z.string().describe("One short sentence explaining the overall judgment"),
  tactics: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      quote: z.string().describe("The exact words from the message, copied verbatim, 2–12 words"),
      why: z.string().describe("One short sentence on why this is manipulative"),
    }),
  ),
});

const SYSTEM = `You are a fraud analyst who labels social-engineering tactics in messages.
${UNTRUSTED_RULE}

Label only tactics that are actually present, each tied to an exact verbatim quote. Categories:
- urgency: deadlines, "within 24 hours", "act now"
- threat: account suspension, arrest, fines, legal action
- authority: claims to be a bank, government, police, employer, tech support
- secrecy: "don't tell anyone", "keep this confidential"
- reward: prizes, refunds, unexpected money, too-good deals
- payment: gift cards, crypto, wire transfer, Zelle/Venmo/Cash App to a person, prepaid cards
- credentials: the message ASKS the reader to provide or enter passwords, one-time codes, card numbers or SSN, or to "verify your identity" via a link. A message that GIVES the reader a code and tells them not to share it is not a credential request.
- remote_access: install an app, AnyDesk/TeamViewer, "let me connect to your computer"
- relationship: "Hi Mum, new number", claims to be a relative or friend in need
- emotional: fear, panic, guilt, romance
Ordinary transactional language in a genuine message ("your order shipped") is not a tactic. Return an empty list if there are none.`;

function normalize(s: string) {
  return s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

export type TacticsResult = { tactics: Tactic[]; findings: Finding[]; messageText: string; language: string };

export async function extractTactics(
  text: string,
  image: Anthropic.ImageBlockParam | null,
): Promise<TacticsResult> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (image) content.push(image);
  content.push({ type: "text", text: `Label the manipulation tactics in this message.\n\n${untrusted(text || "(see the attached screenshot)")}` });

  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(TacticsSchema) },
    messages: [{ role: "user", content }],
  });
  const out = res.parsed_output;
  if (!out) return { tactics: [], findings: [], messageText: text, language: "English" };

  // Anti-hallucination: a quote must really appear in the message text.
  const haystack = normalize(text || out.messageText);
  const kept = out.tactics.filter((t) => t.quote.trim().length > 0 && haystack.includes(normalize(t.quote)));

  const tactics: Tactic[] = kept.map((t) => ({ label: TACTIC_LABELS[t.category], quote: t.quote.trim() }));
  const findings = kept.map((t) =>
    finding(`tactic_${t.category}`, `"${t.quote.trim()}" — ${t.why}`, TACTIC_LABELS[t.category]),
  );
  const judged = judgmentFinding(out.overall, out.overallWhy);
  return { tactics, findings: judged ? [...findings, judged] : findings, messageText: out.messageText || text, language: out.language || "English" };
}

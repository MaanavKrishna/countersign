import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Band, Finding, Tactic } from "@/lib/core/types";
import { MODEL, UNTRUSTED_RULE, anthropic, textOf, untrusted } from "@/lib/ai/client";

export type CaseFile = {
  messageText: string;
  findings: Finding[];
  tactics: Tactic[];
  prosecution: string;
  risk: number;
  band: Band;
  language?: string;
};

function evidenceList(findings: Finding[]): string {
  const rows = findings
    .filter((f) => f.signalId !== "inconclusive")
    .map((f) => `- [${f.kind}${f.weight ? ` ${f.weight.toFixed(2)}` : ""}] ${f.label}: ${f.detail}`);
  return rows.length ? rows.join("\n") : "- (no tool evidence)";
}

function caseText(c: CaseFile): string {
  return `${untrusted(c.messageText.slice(0, 6000))}

Evidence from the investigation tools:
${evidenceList(c.findings)}

Manipulation tactics found (exact quotes): ${c.tactics.map((t) => `${t.label}: "${t.quote}"`).join("; ") || "none"}`;
}

export async function argueDefense(c: CaseFile): Promise<string> {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 3000,
    output_config: { effort: "low" },
    system: `You are the defense in a fraud review. Your job is to stop genuine messages from being wrongly flagged. Make the strongest honest case that this message is legitimate: which evidence is consistent with a real organization, which red flags have innocent explanations (marketing shorteners, real security alerts do create urgency, etc.). Never invent evidence. If the case against it is overwhelming, concede which facts you cannot answer. 2–3 sentences, plain language, no preamble.
${UNTRUSTED_RULE}`,
    messages: [
      {
        role: "user",
        content: `${caseText(c)}

The prosecution argued: ${c.prosecution || "(no closing argument)"}

Your defense:`,
      },
    ],
  });
  return textOf(res.content);
}

const RulingSchema = z.object({
  ruling: z.string().describe("2–3 sentences weighing prosecution vs defense and stating the verdict"),
  headline: z.string().describe("A blunt verdict headline of at most 8 words, e.g. 'This is not PayPal.' or 'This alert is genuine.'"),
  summary: z.string().describe("2 sentences for a non-technical reader: what this is and the key evidence"),
  scamType: z.string().describe("e.g. 'Credential phishing', 'Package-delivery smishing', 'Family-emergency scam', or 'Genuine message'"),
  impersonatedBrand: z.string().nullable().describe("The organization or person the message claims to be from, if any"),
  actions: z.array(z.string()).describe("3–4 short imperative steps for what to do now"),
  ifCompromised: z.array(z.string()).describe("2–4 steps if the user already clicked, paid or shared details; empty if genuine"),
  reviewNote: z.string().nullable().describe("Only if you believe the evidence score is badly wrong: say why. Otherwise null."),
});

export type Ruling = z.infer<typeof RulingSchema>;

const BAND_WORDS: Record<Band, string> = {
  forgery: "FORGERY (scam)",
  unverified: "UNVERIFIED (suspicious — not enough to clear it)",
  countersigned: "COUNTERSIGNED (likely genuine)",
};

export async function judge(c: CaseFile, defense: string): Promise<Ruling | null> {
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 6000,
    output_config: { effort: "medium", format: zodOutputFormat(RulingSchema) },
    system: `You are the judge in a fraud review. You hear a prosecution and a defense about a suspicious message and write the final ruling for an ordinary person.
${UNTRUSTED_RULE}

The verdict band is fixed by a deterministic evidence score and you cannot change it. Write the headline, summary and ruling consistent with that band. If you are convinced the score is badly wrong, explain in reviewNote — the user will see it.
Actions must never tell the user to use any link, phone number or email address from the message; tell them to go to the organization through a channel they already trust. Never invent phone numbers or URLs.

Write ruling, headline, summary, scamType, actions and ifCompromised in the same language as the suspicious message (for example Spanish for a Spanish message). Keep brand names and URLs unchanged.`,
    messages: [
      {
        role: "user",
        content: `${caseText(c)}

Prosecution: ${c.prosecution || "(no closing argument)"}

Defense: ${defense || "(no defense offered)"}

Evidence score: ${(c.risk * 100).toFixed(0)}% → verdict band ${BAND_WORDS[c.band]}.${c.language && c.language.toLowerCase() !== "english" ? `

The message is in ${c.language}. Write every field of your ruling in ${c.language}.` : ""}`,
      },
    ],
  });
  return res.parsed_output ?? null;
}

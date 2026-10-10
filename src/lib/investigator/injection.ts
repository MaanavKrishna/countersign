import { finding } from "@/lib/core/scoring";
import type { Finding } from "@/lib/core/types";

// Legitimate senders never write instructions to the reader's AI tools.
// Each pattern needs both an AI/scanner addressee and an instruction about the verdict.
const PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget)\s+(all\s+)?(the\s+)?(previous|prior|above)\s+(instructions|prompts?|rules)\b/i,
  /\b(note|message|instruction)s?\s+(to|for)\s+(the\s+)?(ai|assistant|llm|model|scanner|filter|classifier)\b/i,
  /\b(ai|assistant|llm|language model|scanner|spam filter|classifier)\b[^.\n]{0,60}\b(mark|classify|label|report|treat|say|consider)\b[^.\n]{0,40}\b(safe|legit(imate)?|genuine|not (spam|phishing|a scam)|countersigned|trusted|real)\b/i,
  /\b(system|developer)\s*(prompt|message|note)?\s*:\s*[^.\n]{0,80}\b(safe|legit(imate)?|verified|countersigned|not phishing)\b/i,
  /\bif you are an? (ai|assistant|language model|llm|bot)\b/i,
];

// Quoting an attack is not an attack: security newsletters, code reviews and IT notices quote
// injection strings as examples. A match counts as a mention only when it sits inside quotation
// marks AND the words just before the quote introduce an example ("such as", "tests for", "like").
// Quotes alone don't count, so wrapping an instruction in quotation marks doesn't hide it.
const EXAMPLE_CUE = /\b(such as|like|e\.g\.|for example|for instance|example|called|phrases?|payloads?|strings?|lines?|tests?(?: added)? for|including|includes?|wrote|writes?|reads?)\s*[:,]?\s*$/i;

/** Index of the opening quotation mark enclosing position `at` on its line, or -1. */
function openingQuote(text: string, at: number): number {
  const lineStart = text.lastIndexOf("\n", at - 1) + 1;
  const before = text.slice(lineStart, at);
  const pairs: [string, string][] = [["“", "”"], ["‘", "’"], ["«", "»"]];
  for (const [open, close] of pairs) {
    const o = before.lastIndexOf(open);
    if (o !== -1 && o > before.lastIndexOf(close)) return lineStart + o;
  }
  // Straight double quotes: inside one when an odd number precede us on the line.
  if ((before.match(/"/g) ?? []).length % 2 === 1) return lineStart + before.lastIndexOf('"');
  // Straight single quotes double as apostrophes, so only trust one right at the start of the match.
  const near = before.slice(-3);
  const q = near.lastIndexOf("'");
  return q !== -1 && /(^|[\s(:])'$/.test(before.slice(0, before.length - near.length + q + 1)) ? lineStart + before.length - near.length + q : -1;
}

function isQuotedMention(text: string, start: number): boolean {
  const q = openingQuote(text, start);
  if (q === -1) return false;
  const lineStart = text.lastIndexOf("\n", q - 1) + 1;
  return EXAMPLE_CUE.test(text.slice(Math.max(lineStart, q - 60), q));
}

export function detectAiDirectedText(text: string): Finding[] {
  let mention: string | null = null;
  for (const re of PATTERNS) {
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of text.matchAll(global)) {
      const quote = m[0].length > 90 ? `${m[0].slice(0, 90)}…` : m[0];
      if (isQuotedMention(text, m.index)) {
        mention ??= quote;
        continue;
      }
      return [finding("ai_directed_instructions", `The message contains text written to manipulate AI scanners: "${quote}"`)];
    }
  }
  return mention ? [finding("ai_text_quoted", `Quotes AI-instruction text as an example ("${mention}"), so it isn't counted as an attack.`)] : [];
}

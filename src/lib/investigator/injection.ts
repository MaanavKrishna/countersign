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

export function detectAiDirectedText(text: string): Finding[] {
  for (const re of PATTERNS) {
    const m = re.exec(text);
    if (m) {
      const quote = m[0].length > 90 ? `${m[0].slice(0, 90)}…` : m[0];
      return [finding("ai_directed_instructions", `The message contains text written to manipulate AI scanners: "${quote}"`)];
    }
  }
  return [];
}

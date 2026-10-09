import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL, anthropic, untrusted } from "../agent/client";
import type { Band } from "../types";

// What a typical hackathon entry does: one prompt, the model's own verdict.
const Verdict = z.object({ verdict: z.enum(["scam", "suspicious", "legitimate"]) });

export async function llmOnlyBand(text: string): Promise<Band> {
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "medium", format: zodOutputFormat(Verdict) },
    system: "You are a fraud detection assistant. Decide whether the message is a scam.",
    messages: [{ role: "user", content: `Is this message a scam?\n${untrusted(text)}` }],
  });
  const v = res.parsed_output?.verdict;
  return v === "scam" ? "forgery" : v === "legitimate" ? "countersigned" : "unverified";
}

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL, anthropic, untrusted } from "@/lib/ai/client";
import type { Band } from "@/lib/core/types";

// What a typical hackathon entry does: one prompt, the model's own verdict.
const Verdict = z.object({ verdict: z.enum(["scam", "suspicious", "legitimate"]) });

export async function llmOnlyBand(text: string, image?: { mediaType: "image/png"; base64: string } | null): Promise<Band> {
  const prompt = `Is this message a scam?\n${untrusted(text)}`;
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "medium", format: zodOutputFormat(Verdict) },
    system: "You are a fraud detection assistant. Decide whether the message is a scam.",
    messages: [
      {
        role: "user",
        content: image
          ? [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } }, { type: "text", text: `${prompt}\n(The attached image is part of the message.)` }]
          : prompt,
      },
    ],
  });
  const v = res.parsed_output?.verdict;
  return v === "scam" ? "forgery" : v === "legitimate" ? "countersigned" : "unverified";
}

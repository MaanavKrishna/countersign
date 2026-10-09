import { finding } from "./scoring";
import type { Finding } from "./types";

export type OverallVerdict = "scam" | "unsure" | "legitimate";

/** The model's holistic read of the message, as one weighted piece of evidence. */
export function judgmentFinding(verdict: OverallVerdict, why: string): Finding | null {
  if (verdict === "scam") return finding("model_judgment_scam", why || "The AI judged the message a scam overall.");
  if (verdict === "legitimate") return finding("model_judgment_legit", why || "The AI judged the message genuine overall.");
  return null;
}

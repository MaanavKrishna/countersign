import type { ShieldStage } from "@/lib/shield/types";

export function stageFor(risk: number): ShieldStage {
  if (risk >= 0.6) return "danger";
  if (risk >= 0.25) return "caution";
  return "calm";
}

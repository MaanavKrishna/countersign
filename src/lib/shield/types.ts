// Types for Call Shield's live assessment of a call transcript.

import type { Tactic } from "@/lib/core/types";

export type ShieldStage = "calm" | "caution" | "danger";

export type ShieldAssessment = {
  risk: number;
  stage: ShieldStage;
  tactics: Tactic[];
  claimedIdentity: string | null;
  advice: string;
  challengeNow: boolean;
  challengeTopic: string | null;
  /** "device": on-device rules, nothing sent. "rules": the server's fallback to the same rules. */
  source?: "ai" | "device" | "rules";
};

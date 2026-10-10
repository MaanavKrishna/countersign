// Tactic categories shared by the AI paths and the on-device Call Shield (no SDK imports here).

export const CATEGORIES = [
  "urgency", "threat", "authority", "secrecy", "reward", "payment", "credentials", "remote_access", "relationship", "emotional",
] as const;

export const TACTIC_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  urgency: "Urgency",
  threat: "Threat",
  authority: "Authority",
  secrecy: "Secrecy",
  reward: "Reward bait",
  payment: "Untraceable payment",
  credentials: "Credential request",
  remote_access: "Remote access",
  relationship: "Relationship claim",
  emotional: "Emotional pressure",
};

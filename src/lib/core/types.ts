// Types shared by every module: a piece of evidence, a verdict band, a quoted tactic.

export type Band = "forgery" | "unverified" | "countersigned";

export type Finding = {
  signalId: string;
  /** Short human label, e.g. "Domain registered 6 days ago". */
  label: string;
  /** Evidence detail shown under the label. */
  detail: string;
  /** Weight looked up from the signal registry (0 for neutral / inconclusive). */
  weight: number;
  kind: "risk" | "trust" | "neutral";
};

export type Tactic = { label: string; quote: string };

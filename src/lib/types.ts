// Shared types between the investigation pipeline, the API routes and the UI.

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

export type GraphNodeKind =
  | "exhibit"
  | "sender"
  | "domain"
  | "url"
  | "ip"
  | "brand"
  | "fact"
  | "phone";

export type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  suspicious?: boolean;
};

export type GraphEdge = {
  source: string;
  target: string;
  label?: string;
  deceptive?: boolean;
};

export type GraphDelta = { nodes: GraphNode[]; edges: GraphEdge[] };

export type ToolOutput = {
  summary: string;
  findings: Finding[];
  graph: GraphDelta;
};

export type Indicators = {
  urls: string[];
  domains: string[];
  emails: string[];
  phones: string[];
  money: string[];
  paymentMethods: string[];
  headers: Record<string, string> | null;
  senderDomain: string | null;
  replyToDomain: string | null;
  returnPathDomain: string | null;
  displayName: string | null;
  claimedBrands: string[];
};

export type Tactic = { label: string; quote: string };

export type Report = {
  band: Band;
  risk: number;
  headline: string;
  summary: string;
  scamType: string;
  tactics: Tactic[];
  actions: string[];
  ifCompromised: string[];
  verify: { brand: string; url: string; note: string } | null;
  reviewNote: string | null;
  degraded: boolean;
};

export type InvestigationEvent =
  | { type: "indicators"; indicators: Indicators }
  | { type: "thought"; text: string }
  | { type: "tool_start"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; name: string; summary: string; findings: Finding[] }
  | { type: "graph"; delta: GraphDelta }
  | { type: "score"; risk: number; band: Band }
  | { type: "tactics"; tactics: Tactic[] }
  | { type: "sandbox"; url: string; screenshot: string }
  | { type: "debate"; role: "prosecution" | "defense" | "judge"; text: string }
  | { type: "report"; report: Report }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; elapsedMs: number };

export type ShieldStage = "calm" | "caution" | "danger";

export type ShieldAssessment = {
  risk: number;
  stage: ShieldStage;
  tactics: Tactic[];
  claimedIdentity: string | null;
  advice: string;
  challengeNow: boolean;
  challengeTopic: string | null;
};

export type RunOptions = { ai: boolean; combination?: boolean };
export type CaseResult = { report: Report; findings: Finding[]; toolsRun: number; elapsedMs: number };

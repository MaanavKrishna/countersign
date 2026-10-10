import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { argueDefense, judge, type Ruling } from "@/lib/investigator/agents/debate";
import { investigate } from "@/lib/investigator/agents/investigator";
import { extractTactics, type TacticsResult } from "@/lib/investigator/agents/tactics";
import { brandByName, brandForDomain, type Brand } from "@/lib/core/brands";
import { hostFromUrl, registrableDomain } from "@/lib/core/domain";
import { extractIndicators } from "@/lib/investigator/indicators";
import { detectAiDirectedText } from "@/lib/investigator/injection";
import { impersonationAsk } from "@/lib/investigator/combination";
import { finding, score } from "@/lib/core/scoring";
import { runTool, type ToolRun } from "./tools";
import { EXHIBIT_ID, factNodeId } from "@/lib/investigator/tools/graphIds";
import type { Finding, Tactic } from "@/lib/core/types";
import type { InvestigationEvent, Report, RunOptions } from "@/lib/investigator/types";

type Emit = (e: InvestigationEvent) => void;

export type InvestigationInput = {
  text: string;
  image: { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; base64: string } | null;
  /** Evidence a channel already has (e.g. a mail provider's risk scores). */
  extraFindings?: Finding[];
};

const GENERIC_ACTIONS = [
  "Don't click links, call numbers or reply to the message.",
  "Contact the organization yourself using its official app or a number you already trust.",
  "Report it at reportfraud.ftc.gov (US) or your country's fraud line.",
];
const GENERIC_COMPROMISED = [
  "Call your bank using the number on the back of your card and freeze the card.",
  "Change the password from the official app or site, and turn on two-step verification.",
  "Watch your statements and credit report for the next 60 days.",
];

export async function runInvestigation(input: InvestigationInput, emit: Emit, opts: RunOptions = { ai: true }): Promise<void> {
  const started = Date.now();
  const text = input.text.slice(0, 20000);
  const image: Anthropic.ImageBlockParam | null = input.image
    ? { type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 } }
    : null;

  const ind = extractIndicators(text);
  emit({ type: "indicators", indicators: ind });
  emit({ type: "graph", delta: { nodes: [{ id: EXHIBIT_ID, label: "Exhibit A", kind: "exhibit" }], edges: [] } });

  const all: Finding[] = [];
  const pushScore = () => {
    const s = score(all);
    emit({ type: "score", ...s });
  };

  const injected = detectAiDirectedText(text);
  if (injected.length) {
    all.push(...injected);
    emit({ type: "tool_start", id: "injection", name: "injection_check", args: {} });
    emit({ type: "tool_result", id: "injection", name: "injection_check", summary: injected[0].detail, findings: injected });
    pushScore();
  }

  if (input.extraFindings?.length) {
    all.push(...input.extraFindings);
    emit({ type: "tool_start", id: "provider", name: "provider_signals", args: {} });
    emit({ type: "tool_result", id: "provider", name: "provider_signals", summary: "Signals from the mail provider", findings: input.extraFindings });
    pushScore();
  }

  const onTool = (name: string, run: ToolRun, args: Record<string, unknown>) => {
    all.push(...run.findings);
    if (run.graph.nodes.length || run.graph.edges.length) emit({ type: "graph", delta: run.graph });
    if (name === "sandbox_scan" && run.screenshot) emit({ type: "sandbox", url: String(args.url), screenshot: run.screenshot });
    pushScore();
  };

  // Tactic labelling runs in parallel with the tool investigation.
  const tacticsPromise: Promise<TacticsResult | null> = (opts.ai ? extractTactics(text, image) : Promise.resolve(null))
    .then((r) => {
      if (!r) return null;
      if (opts.judgment === false) r = { ...r, findings: r.findings.filter((f) => !f.signalId.startsWith("model_judgment_")) };
      all.push(...r.findings);
      emit({ type: "tactics", tactics: r.tactics });
      const judged = r.findings.filter((f) => f.signalId.startsWith("model_judgment_"));
      if (judged.length) {
        emit({ type: "tool_start", id: "judgment", name: "overall_judgment", args: {} });
        emit({ type: "tool_result", id: "judgment", name: "overall_judgment", summary: judged[0].detail, findings: judged });
      }
      if (r.tactics.length) {
        emit({
          type: "graph",
          delta: {
            nodes: r.tactics.slice(0, 3).map((t, i) => ({ id: factNodeId("tactic", String(i)), label: `${t.label.toLowerCase()} · "${t.quote.slice(0, 28)}${t.quote.length > 28 ? "…" : ""}"`, kind: "fact" as const, suspicious: true })),
            edges: r.tactics.slice(0, 3).map((_, i) => ({ source: EXHIBIT_ID, target: factNodeId("tactic", String(i)), label: "tactic" })),
          },
        });
      }
      pushScore();
      return r;
    })
    .catch((err) => {
      emit({ type: "error", message: `Tactic analysis failed: ${(err as Error).message}`, recoverable: true });
      return null;
    });

  let prosecution = "";
  let checked = { lookalike: new Set<string>(), rdap: new Set<string>(), trace: new Set<string>(), emailAuth: false };
  let aiOk = opts.ai;
  if (opts.ai) {
    try {
      emit({ type: "thought", text: "Opening the case file and planning which lookups to run." });
      const res = await investigate(text, image, ind, emit, onTool);
      prosecution = res.prosecution;
      checked = res.checked;
    } catch (err) {
      aiOk = false;
      emit({ type: "error", message: `AI investigator unavailable (${(err as Error).message}). Running the standard checks instead.`, recoverable: true });
    }
  }

  // Safety net: run the deterministic checks the agent skipped, so the score
  // never depends on the model remembering to look.
  await sweep(ind, checked, emit, onTool);
  linkTrust(ind, all);

  const tacticsResult = await tacticsPromise;
  if (opts.combination !== false) {
    const combo = impersonationAsk(all, ind.claimedBrands);
    if (combo.length) {
      all.push(...combo);
      emit({ type: "tool_start", id: "combination", name: "impersonation_check", args: {} });
      emit({ type: "tool_result", id: "combination", name: "impersonation_check", summary: combo[0].detail, findings: combo });
    }
  }
  const tactics: Tactic[] = tacticsResult?.tactics ?? [];
  const messageText = tacticsResult?.messageText ?? text;
  const { risk, band } = score(all);
  emit({ type: "score", risk, band });

  let ruling: Ruling | null = null;
  if (aiOk) {
    try {
      if (prosecution) emit({ type: "debate", role: "prosecution", text: prosecution });
      const caseFile = { messageText, findings: all, tactics, prosecution, risk, band, language: tacticsResult?.language };
      const defense = await argueDefense(caseFile);
      emit({ type: "debate", role: "defense", text: defense });
      ruling = await judge(caseFile, defense);
      if (ruling) emit({ type: "debate", role: "judge", text: ruling.ruling });
    } catch (err) {
      emit({ type: "error", message: `Debate step failed: ${(err as Error).message}`, recoverable: true });
    }
  }

  const brand = pickBrand(ruling?.impersonatedBrand ?? null, ind.claimedBrands, ind.senderDomain);
  const report: Report = {
    band,
    risk,
    headline: ruling?.headline ?? fallbackHeadline(band, brand),
    summary: ruling?.summary ?? fallbackSummary(all),
    scamType: ruling?.scamType ?? (band === "countersigned" ? "No fraud evidence found" : "Suspected fraud"),
    tactics,
    actions: ruling?.actions?.length ? ruling.actions : band === "countersigned" ? ["If anything still feels off, contact the sender through a channel you already trust."] : GENERIC_ACTIONS,
    ifCompromised: band === "countersigned" ? [] : ruling?.ifCompromised?.length ? ruling.ifCompromised : GENERIC_COMPROMISED,
    verify: brand ? { brand: brand.name, url: brand.help, note: `Type ${brand.domains[0]} into your browser yourself, or open the official ${brand.name} app.` } : null,
    reviewNote: ruling?.reviewNote ?? null,
    degraded: !aiOk || !ruling,
  };
  emit({ type: "report", report });
  emit({ type: "done", elapsedMs: Date.now() - started });
}

async function sweep(
  ind: ReturnType<typeof extractIndicators>,
  checked: { lookalike: Set<string>; rdap: Set<string>; trace: Set<string>; emailAuth: boolean },
  emit: Emit,
  onTool: (name: string, run: ToolRun, args: Record<string, unknown>) => void,
) {
  const jobs: { name: string; args: Record<string, unknown> }[] = [];
  if (ind.headers && !checked.emailAuth) jobs.push({ name: "email_auth", args: {} });
  for (const d of ind.domains.slice(0, 8)) {
    if (!checked.lookalike.has(d)) jobs.push({ name: "lookalike_check", args: { domain: d } });
  }
  const rdapTargets = [ind.senderDomain, ...ind.urls.map(hostFromUrl)]
    .filter((d): d is string => !!d)
    .map(registrableDomain)
    .filter((d, i, a) => a.indexOf(d) === i && !brandForDomain(d) && !checked.rdap.has(d))
    .slice(0, 4);
  for (const d of rdapTargets) jobs.push({ name: "rdap_lookup", args: { domain: d } });
  for (const u of ind.urls.slice(0, 3)) if (!checked.trace.has(u)) jobs.push({ name: "trace_url", args: { url: u } });
  if (jobs.length === 0) return;

  emit({ type: "thought", text: `Double-checking ${jobs.length} item${jobs.length === 1 ? "" : "s"} the investigator didn't cover.` });
  await Promise.all(
    jobs.map(async (job, i) => {
      const id = `sweep_${i}`;
      emit({ type: "tool_start", id, name: job.name, args: job.args });
      try {
        const run = await runTool(job.name, job.args, { indicators: ind });
        onTool(job.name, run, job.args);
        emit({ type: "tool_result", id, name: job.name, summary: run.summary, findings: run.findings });
      } catch (err) {
        emit({ type: "tool_result", id, name: job.name, summary: `Failed: ${(err as Error).message}`, findings: [] });
      }
    }),
  );
}

/** Trust evidence: every link and the sender stay on one brand's own domains. */
function linkTrust(ind: ReturnType<typeof extractIndicators>, all: Finding[]) {
  const hosts = ind.urls.map(hostFromUrl).filter((h): h is string => !!h);
  if (hosts.length === 0) return;
  const brands = hosts.map((h) => brandForDomain(h)?.name ?? null);
  const first = brands[0];
  if (!first || brands.some((b) => b !== first)) return;
  if (ind.senderDomain && brandForDomain(ind.senderDomain)?.name !== first) return;
  if (all.some((f) => f.kind === "risk" && f.weight >= 0.4 && !f.signalId.startsWith("tactic_"))) return;
  all.push(finding("trust_links_on_brand", `All ${hosts.length} link${hosts.length === 1 ? "" : "s"} point to ${first}'s own domains.`));
}

function pickBrand(named: string | null, claimed: string[], sender: string | null): Brand | null {
  if (named) {
    const b = brandByName(named) ?? brandByName(named.split(/[\s(/]/)[0]);
    if (b) return b;
  }
  for (const c of claimed) {
    const b = brandByName(c);
    if (b) return b;
  }
  return sender ? brandForDomain(sender) : null;
}

function fallbackHeadline(band: Report["band"], brand: Brand | null): string {
  if (band === "forgery") return brand ? `This is not ${brand.name}.` : "This is a forgery.";
  if (band === "unverified") return "Don't trust this yet.";
  return "No signs of forgery.";
}

function fallbackSummary(all: Finding[]): string {
  const top = [...all].filter((f) => f.kind === "risk").sort((a, b) => b.weight - a.weight).slice(0, 3);
  if (top.length === 0) return "The checks found no evidence of fraud.";
  return `Key evidence: ${top.map((f) => f.label.toLowerCase()).join("; ")}.`;
}

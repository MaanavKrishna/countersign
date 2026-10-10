import { runInvestigation, type InvestigationInput } from "@/lib/investigator/pipeline";
import type { CaseResult, Report, RunOptions } from "@/lib/investigator/types";
import type { Finding } from "@/lib/core/types";

/** Runs the full pipeline and returns the final case, for non-streaming channels and the eval. */
export async function collectCase(input: InvestigationInput, opts: RunOptions = { ai: true }): Promise<CaseResult> {
  const findings: Finding[] = [];
  let report: Report | null = null;
  let toolsRun = 0;
  const t0 = Date.now();
  await runInvestigation(
    input,
    (e) => {
      if (e.type === "tool_result") {
        toolsRun++;
        findings.push(...e.findings);
      }
      if (e.type === "tactics") {
        // Tactic findings aren't sent as tool results; keep their labels for renderers.
        for (const t of e.tactics) findings.push({ signalId: "tactic", label: t.label, detail: `"${t.quote}"`, weight: 0, kind: "neutral" });
      }
      if (e.type === "report") report = e.report;
    },
    opts,
  );
  if (!report) throw new Error("Investigation ended without a report");
  return { report, findings, toolsRun, elapsedMs: Date.now() - t0 };
}

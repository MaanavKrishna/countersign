import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVAL_CASES } from "../eval/cases";
import { llmOnlyBand } from "../eval/baseline";
import { summarize, type ArmMetrics, type EvalRow } from "../eval/metrics";
import { collectCase } from "../report/collect";

// Opt-in: calls the model API and the network. EVAL=1 npx vitest run eval
type EvalResults = {
  generatedAt: string;
  arms: { id: "llm-only" | "evidence-only" | "countersign"; label: string; metrics: ArmMetrics; rows: EvalRow[] }[];
};

async function runArm(fn: (text: string) => Promise<{ band: EvalRow["band"]; risk: number }>): Promise<EvalRow[]> {
  const rows: EvalRow[] = [];
  for (const c of EVAL_CASES) {
    const t0 = Date.now();
    try {
      const { band, risk } = await fn(c.text);
      rows.push({ id: c.id, label: c.label, band, risk, ms: Date.now() - t0 });
    } catch {
      rows.push({ id: c.id, label: c.label, band: "error", risk: -1, ms: Date.now() - t0 });
    }
  }
  return rows;
}

describe.skipIf(!process.env.EVAL)("ablation eval", () => {
  it("runs three arms and writes eval/results.json", async () => {
    const llm = await runArm(async (t) => ({ band: await llmOnlyBand(t), risk: -1 }));
    const det = await runArm(async (t) => {
      const r = await collectCase({ text: t, image: null }, { ai: false });
      return { band: r.report.band, risk: r.report.risk };
    });
    const full = await runArm(async (t) => {
      const r = await collectCase({ text: t, image: null }, { ai: true });
      return { band: r.report.band, risk: r.report.risk };
    });
    const results: EvalResults = {
      generatedAt: new Date().toISOString(),
      arms: [
        { id: "llm-only", label: "Single LLM prompt (typical entry)", metrics: summarize(llm), rows: llm },
        { id: "evidence-only", label: "Deterministic checks only (no AI)", metrics: summarize(det), rows: det },
        { id: "countersign", label: "Countersign (agent + evidence + debate)", metrics: summarize(full), rows: full },
      ],
    };
    mkdirSync("eval", { recursive: true });
    writeFileSync("eval/results.json", JSON.stringify(results, null, 2));
    for (const a of results.arms) console.log(a.id, JSON.stringify(a.metrics));
    console.table(EVAL_CASES.map((c, i) => ({ id: c.id, label: c.label, llm: llm[i].band, det: det[i].band, full: full[i].band })));
    expect(summarize(full).dangerousMisses).toBe(0);
  }, 1_800_000);
});

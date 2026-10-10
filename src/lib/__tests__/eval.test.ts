import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVAL_CASES } from "../eval/cases";
import { ADVERSARIAL_CASES } from "../eval/adversarialCases";
import { HARD_CASES } from "../eval/hardCases";
import { llmOnlyBand } from "../eval/baseline";
import { summarize, type ArmMetrics, type EvalRow } from "../eval/metrics";
import { collectCase } from "../report/collect";

// Opt-in: calls the model API and the network. EVAL=1 npx vitest run eval
type Row = EvalRow & { set: "easy" | "hard" | "adversarial" };
type ArmId = "llm-only" | "evidence-only" | "countersign-v1" | "countersign";
type EvalResults = {
  generatedAt: string;
  hardSetCommit: string;
  adversarialSetCommit: string;
  arms: { id: ArmId; label: string; metrics: { all: ArmMetrics; easy: ArmMetrics; hard: ArmMetrics; adversarial: ArmMetrics }; rows: Row[] }[];
};

const CASES = [
  ...EVAL_CASES.map((c) => ({ ...c, set: "easy" as const })),
  ...HARD_CASES.map((c) => ({ ...c, set: "hard" as const })),
  ...ADVERSARIAL_CASES.map((c) => ({ ...c, set: "adversarial" as const })),
];

async function runArm(fn: (text: string) => Promise<{ band: EvalRow["band"]; risk: number }>, concurrency = 3): Promise<Row[]> {
  const rows: Row[] = new Array(CASES.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < CASES.length) {
        const i = next++;
        const c = CASES[i];
        const t0 = Date.now();
        try {
          const { band, risk } = await fn(c.text);
          rows[i] = { id: c.id, label: c.label, set: c.set, band, risk, ms: Date.now() - t0 };
        } catch {
          rows[i] = { id: c.id, label: c.label, set: c.set, band: "error", risk: -1, ms: Date.now() - t0 };
        }
      }
    }),
  );
  return rows;
}

const metrics = (rows: Row[]) => ({
  all: summarize(rows),
  easy: summarize(rows.filter((r) => r.set === "easy")),
  hard: summarize(rows.filter((r) => r.set === "hard")),
  adversarial: summarize(rows.filter((r) => r.set === "adversarial")),
});

const full = (v: "v1" | "final") => async (t: string) => {
  const r = await collectCase({ text: t, image: null }, v === "v1" ? { ai: true, combination: false, judgment: false } : { ai: true });
  return { band: r.report.band, risk: r.report.risk };
};

describe.skipIf(!process.env.EVAL)("ablation eval", () => {
  it("runs four arms over the easy and hard sets and writes eval/results.json", async () => {
    const llm = await runArm(async (t) => ({ band: await llmOnlyBand(t), risk: -1 }));
    const det = await runArm(async (t) => {
      const r = await collectCase({ text: t, image: null }, { ai: false });
      return { band: r.report.band, risk: r.report.risk };
    });
    const v1 = await runArm(full("v1"));
    const v2 = await runArm(full("final"));
    const results: EvalResults = {
      generatedAt: new Date().toISOString(),
      hardSetCommit: "34e3ba0",
      adversarialSetCommit: process.env.ADVERSARIAL_COMMIT ?? "",
      arms: [
        { id: "llm-only", label: "Single LLM prompt (typical entry)", metrics: metrics(llm), rows: llm },
        { id: "evidence-only", label: "Deterministic checks only (no AI)", metrics: metrics(det), rows: det },
        { id: "countersign-v1", label: "Countersign v1 (evidence + tactics only)", metrics: metrics(v1), rows: v1 },
        { id: "countersign", label: "Countersign", metrics: metrics(v2), rows: v2 },
      ],
    };
    mkdirSync("eval", { recursive: true });
    writeFileSync("eval/results.json", JSON.stringify(results, null, 2));
    for (const a of results.arms) console.log(a.id, "easy", JSON.stringify(a.metrics.easy), "\n", a.id, "hard", JSON.stringify(a.metrics.hard));
    console.table(CASES.map((c, i) => ({ id: c.id, set: c.set, label: c.label, llm: llm[i].band, det: det[i].band, v1: v1[i].band, v2: v2[i].band })));
    expect(results.arms.length).toBe(4);
  }, 3_600_000);
});

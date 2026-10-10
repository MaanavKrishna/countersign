import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVAL_CASES } from "@/lib/eval/cases";
import { ADVERSARIAL_CASES } from "@/lib/eval/adversarialCases";
import { MENTION_CASES, QR_CASES } from "@/lib/eval/freshCases";
import { HARD_CASES } from "@/lib/eval/hardCases";
import { HOLDOUT_MENTION, HOLDOUT_QR } from "@/lib/eval/holdoutCases";
import { qrPicture } from "@/lib/eval/qrImage";
import { decodeQrFromImageData, qrNote } from "@/lib/investigator/qr";
import { llmOnlyBand } from "@/lib/eval/baseline";
import { summarize, type ArmMetrics, type EvalRow } from "@/lib/eval/metrics";
import { collectCase } from "@/lib/investigator/report/collect";

// Opt-in: calls the model API and the network. EVAL=1 npx vitest run eval
type SetId = "easy" | "hard" | "adversarial" | "qr" | "mention" | "holdout";
type Row = EvalRow & { set: SetId };
type ArmId = "llm-only" | "evidence-only" | "countersign-v1" | "countersign";
type EvalResults = {
  generatedAt: string;
  hardSetCommit: string;
  adversarialSetCommit: string;
  freshSetCommit: string;
  holdoutSetCommit: string;
  arms: { id: ArmId; label: string; metrics: Record<"all" | SetId, ArmMetrics>; rows: Row[] }[];
};

const CASES = [
  ...EVAL_CASES.map((c) => ({ ...c, set: "easy" as const })),
  ...HARD_CASES.map((c) => ({ ...c, set: "hard" as const })),
  ...ADVERSARIAL_CASES.map((c) => ({ ...c, set: "adversarial" as const })),
  ...QR_CASES.map((c) => ({ ...c, set: "qr" as const })),
  ...MENTION_CASES.map((c) => ({ ...c, set: "mention" as const })),
  ...[...HOLDOUT_QR, ...HOLDOUT_MENTION].map((c) => ({ ...c, set: "holdout" as const })),
];

type Prepared = { text: string; llmText: string; image: { mediaType: "image/png"; base64: string } | null };

/** What each system receives. For a QR case, both get the picture; Countersign also decodes it,
 *  exactly as the browser does before sending a screenshot. */
async function prepare(c: { text: string; qr?: string }): Promise<Prepared> {
  if (!c.qr) return { text: c.text, llmText: c.text, image: null };
  const pic = await qrPicture(c.qr);
  return { text: (c.text + qrNote(decodeQrFromImageData(pic.pixels))).trim(), llmText: c.text, image: pic.png };
}

async function runArm(fn: (p: Prepared) => Promise<{ band: EvalRow["band"]; risk: number }>, concurrency = 3): Promise<Row[]> {
  const rows: Row[] = new Array(CASES.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < CASES.length) {
        const i = next++;
        const c = CASES[i];
        const t0 = Date.now();
        try {
          const { band, risk } = await fn(await prepare(c));
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
  qr: summarize(rows.filter((r) => r.set === "qr")),
  mention: summarize(rows.filter((r) => r.set === "mention")),
  holdout: summarize(rows.filter((r) => r.set === "holdout")),
});

const full = (v: "v1" | "final") => async (p: Prepared) => {
  const r = await collectCase({ text: p.text, image: p.image }, v === "v1" ? { ai: true, combination: false, judgment: false } : { ai: true });
  return { band: r.report.band, risk: r.report.risk };
};

describe.skipIf(!process.env.EVAL)("ablation eval", () => {
  it("runs four arms over the easy and hard sets and writes eval/results.json", async () => {
    const llm = await runArm(async (p) => ({ band: await llmOnlyBand(p.llmText, p.image), risk: -1 }));
    const det = await runArm(async (p) => {
      const r = await collectCase({ text: p.text, image: p.image }, { ai: false });
      return { band: r.report.band, risk: r.report.risk };
    });
    const v1 = await runArm(full("v1"));
    const v2 = await runArm(full("final"));
    const results: EvalResults = {
      generatedAt: new Date().toISOString(),
      hardSetCommit: "34e3ba0",
      adversarialSetCommit: "0744fe0",
      freshSetCommit: "50a4fe9",
      holdoutSetCommit: "61f3639",
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

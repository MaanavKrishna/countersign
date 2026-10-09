import type { Band } from "../types";

export type EvalRow = { id: string; label: "scam" | "legit"; band: Band | "error"; risk: number; ms: number };
export type ArmMetrics = {
  n: number; tp: number; fp: number; tn: number; fn: number;
  precision: number; recall: number; falsePositiveRate: number;
  strictAccuracy: number; dangerousMisses: number; medianMs: number;
};

export function summarize(rows: EvalRow[]): ArmMetrics {
  const scams = rows.filter((r) => r.label === "scam");
  const legit = rows.filter((r) => r.label === "legit");
  const tp = scams.filter((r) => r.band === "forgery").length;
  const fn = scams.length - tp;
  const fp = legit.filter((r) => r.band === "forgery").length;
  const tn = legit.filter((r) => r.band === "countersigned").length;
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const div = (a: number, b: number) => (b === 0 ? 0 : a / b);
  return {
    n: rows.length, tp, fp, tn, fn,
    precision: div(tp, tp + fp),
    recall: div(tp, scams.length),
    falsePositiveRate: div(fp, legit.length),
    strictAccuracy: div(tp + tn, rows.length),
    dangerousMisses: scams.filter((r) => r.band === "countersigned").length,
    medianMs: ms.length ? ms[Math.floor(ms.length / 2)] : 0,
  };
}

import results from "../../../eval/results.json";

type Metrics = { n: number; precision: number; recall: number; falsePositiveRate: number; strictAccuracy: number; dangerousMisses: number; medianMs: number };
type Row = { id: string; label: "scam" | "legit"; band: string };
type Arm = { id: string; label: string; metrics: Metrics; rows: Row[] };
const data = results as { generatedAt: string; arms: Arm[] };
const arms = data.arms;
const pct = (x: number) => `${Math.round(x * 100)}%`;

export const metadata = { title: "Evidence — Countersign" };

const BAND_CHIP: Record<string, string> = {
  forgery: "bg-alert-wash text-alert-deep",
  unverified: "bg-amber-wash text-ink",
  countersigned: "bg-trust-wash text-trust-ink",
  error: "bg-paper text-muted",
};

export default function EvidencePage() {
  const ids = arms[0]?.rows.map((r) => r.id) ?? [];
  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 pt-6 pb-20 sm:px-8">
      <header className="flex flex-col gap-4">
        <p className="eyebrow m-0 text-[13px]">Does it actually work?</p>
        <h1 className="condensed m-0 text-[48px] leading-[0.95] font-black uppercase sm:text-[64px]">Measured, not claimed.</h1>
        <p className="m-0 max-w-[720px] text-lg leading-relaxed text-body">
          We ran the same {arms[0]?.metrics.n ?? 0} labelled messages (real-world scam patterns, genuine mail, prompt-injection attacks and Spanish-language cases) through three systems. The first is what most AI scam checkers are: one prompt to a model.
        </p>
      </header>

      {arms.length === 0 ? (
        <p className="rounded-md border-[1.5px] border-dashed border-dash p-6 text-muted">Results will appear after the eval runs.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border-2 border-ink bg-card shadow-block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="eyebrow border-b border-dashed border-dash">
                  <th className="p-4 font-semibold">System</th>
                  <th className="p-4 font-semibold">Scams caught</th>
                  <th className="p-4 font-semibold">False alarms</th>
                  <th className="p-4 font-semibold">Exact verdict</th>
                  <th className="p-4 font-semibold">Scams cleared as genuine</th>
                </tr>
              </thead>
              <tbody>
                {arms.map((a) => (
                  <tr key={a.id} className={`border-b border-line last:border-0 ${a.id === "countersign" ? "bg-trust-wash" : ""}`}>
                    <td className="p-4 font-bold">{a.label}</td>
                    <td className="p-4 font-mono">{pct(a.metrics.recall)}</td>
                    <td className="p-4 font-mono">{pct(a.metrics.falsePositiveRate)}</td>
                    <td className="p-4 font-mono">{pct(a.metrics.strictAccuracy)}</td>
                    <td className={`p-4 font-mono font-bold ${a.metrics.dangerousMisses ? "text-alert-ink" : "text-trust-ink"}`}>{a.metrics.dangerousMisses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="rounded-md border-[1.5px] border-line bg-card p-5">
            <summary className="cursor-pointer font-bold">Every case, every system</summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="eyebrow">
                    <th className="p-2 font-semibold">Case</th>
                    <th className="p-2 font-semibold">Truth</th>
                    {arms.map((a) => (
                      <th key={a.id} className="p-2 font-semibold">{a.id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ids.map((id, i) => (
                    <tr key={id} className="border-t border-line">
                      <td className="p-2 font-mono">{id}</td>
                      <td className="p-2">{arms[0].rows[i].label}</td>
                      {arms.map((a) => (
                        <td key={a.id} className="p-2">
                          <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${BAND_CHIP[a.rows[i].band] ?? ""}`}>{a.rows[i].band}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          ["The AI gathers evidence", "An agent chooses which real lookups to run: domain registry, DNS, email authentication, lookalike detection and redirect tracing."],
          ["Code decides", "Every finding has a fixed weight. A noisy-OR model computes the risk. The AI can argue, but it cannot change the verdict band."],
          ["Injection-proof by design", "Text written to fool AI scanners is detected deterministically and counted as evidence of fraud."],
        ].map(([h, b]) => (
          <article key={h} className="flex flex-col gap-2 rounded-md border-[1.5px] border-line bg-card p-6">
            <h2 className="condensed m-0 text-2xl font-black uppercase">{h}</h2>
            <p className="m-0 leading-relaxed text-body">{b}</p>
          </article>
        ))}
      </section>
      <p className="m-0 font-mono text-xs text-muted">Generated {data.generatedAt ? data.generatedAt.slice(0, 16).replace("T", " ") + " UTC" : "—"} · reproduce with npm run eval</p>
    </main>
  );
}

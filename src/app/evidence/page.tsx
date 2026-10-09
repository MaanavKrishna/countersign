import results from "../../../eval/results.json";

type Metrics = { n: number; recall: number; falsePositiveRate: number; strictAccuracy: number; dangerousMisses: number; tp: number; fp: number; tn: number; fn: number };
type Row = { id: string; label: "scam" | "legit"; set: "easy" | "hard"; band: string };
type Arm = { id: string; label: string; metrics: { all: Metrics; easy: Metrics; hard: Metrics }; rows: Row[] };
const data = results as unknown as { generatedAt: string; hardSetCommit?: string; arms: Arm[] };
const arms = data.arms ?? [];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const REPO = "https://github.com/MaanavKrishna/countersign";

export const metadata = { title: "Evidence — Countersign" };

const BAND_CHIP: Record<string, string> = {
  forgery: "bg-alert-wash text-alert-deep",
  unverified: "bg-amber-wash text-ink",
  countersigned: "bg-trust-wash text-trust-ink",
  error: "bg-paper text-muted",
};

function ResultsTable({ set, title, blurb }: { set: "easy" | "hard"; title: string; blurb: string }) {
  const m0 = arms[0]?.metrics[set];
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="condensed m-0 text-[30px] font-black uppercase">{title}</h2>
        <p className="m-0 max-w-[760px] text-body">
          {blurb} {m0 ? `${m0.tp + m0.fn} scams, ${m0.tn + m0.fp} genuine messages.` : ""}
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border-2 border-ink bg-card shadow-block">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="eyebrow border-b border-dashed border-dash">
              <th className="p-4 font-semibold">System</th>
              <th className="p-4 font-semibold">Scams stamped forgery</th>
              <th className="p-4 font-semibold">Genuine flagged as forgery</th>
              <th className="p-4 font-semibold">Exact verdict</th>
              <th className="p-4 font-semibold">Scams cleared as genuine</th>
            </tr>
          </thead>
          <tbody>
            {arms.map((a) => {
              const m = a.metrics[set];
              return (
                <tr key={a.id} className={`border-b border-line last:border-0 ${a.id === "countersign" ? "bg-trust-wash" : ""}`}>
                  <td className="p-4 font-bold">{a.label}</td>
                  <td className="p-4 font-mono">{pct(m.recall)}</td>
                  <td className="p-4 font-mono">{pct(m.falsePositiveRate)}</td>
                  <td className="p-4 font-mono">{pct(m.strictAccuracy)}</td>
                  <td className={`p-4 font-mono font-bold ${m.dangerousMisses ? "text-alert-ink" : "text-trust-ink"}`}>{m.dangerousMisses}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function EvidencePage() {
  const rows = arms[0]?.rows ?? [];
  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 pt-6 pb-20 sm:px-8">
      <header className="flex flex-col gap-4">
        <p className="eyebrow m-0 text-[13px]">Does it actually work?</p>
        <h1 className="condensed m-0 text-[48px] leading-[0.95] font-black uppercase sm:text-[64px]">Measured, not claimed.</h1>
        <p className="m-0 max-w-[760px] text-lg leading-relaxed text-body">
          We ran the same labelled messages through four systems. The first is what most AI scam checkers are: one prompt to a model. We publish every result, including the ones that don&apos;t favour us.
        </p>
      </header>

      {arms.length === 0 ? (
        <p className="rounded-md border-[1.5px] border-dashed border-dash p-6 text-muted">Results will appear after the eval runs.</p>
      ) : (
        <>
          <ResultsTable
            set="easy"
            title="Textbook scams"
            blurb="Classic scam wording (urgency, gift cards, threats), prompt-injection attempts, Spanish-language messages, and everyday genuine mail."
          />
          <ResultsTable
            set="hard"
            title="Hard set: polished fakes and scary-but-real alerts"
            blurb="Scams with calm, professional wording, where the giveaway is only in the infrastructure (lookalike or disguised domains, mismatched reply addresses), and genuine alerts that look alarming."
          />
          {data.hardSetCommit && (
            <p className="m-0 text-sm text-muted">
              The hard set was committed before any system was run on it:{" "}
              <a className="font-semibold text-trust" href={`${REPO}/commit/${data.hardSetCommit}`}>
                commit {data.hardSetCommit}
              </a>
              . &ldquo;Countersign v1&rdquo; is the version before we added the impersonation-plus-request signal, after the first run showed tactic-only scams were under-scored.
            </p>
          )}

          <details className="rounded-md border-[1.5px] border-line bg-card p-5">
            <summary className="cursor-pointer font-bold">Every case, every system</summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="eyebrow">
                    <th className="p-2 font-semibold">Case</th>
                    <th className="p-2 font-semibold">Set</th>
                    <th className="p-2 font-semibold">Truth</th>
                    {arms.map((a) => (
                      <th key={a.id} className="p-2 font-semibold">{a.id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="p-2 font-mono">{r.id}</td>
                      <td className="p-2">{r.set}</td>
                      <td className="p-2">{r.label}</td>
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

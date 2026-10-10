import { defang } from "@/lib/core/domain";
import { parseHeaders } from "@/lib/investigator/indicators";
import type { Report } from "@/lib/investigator/types";
import type { Tactic } from "@/lib/core/types";

type Range = { start: number; end: number; tactic: Tactic };

function findRanges(text: string, tactics: Tactic[]): Range[] {
  const lower = text.toLowerCase();
  const ranges: Range[] = [];
  for (const t of tactics) {
    const i = lower.indexOf(t.quote.toLowerCase());
    if (i >= 0 && !ranges.some((r) => i < r.end && i + t.quote.length > r.start)) {
      ranges.push({ start: i, end: i + t.quote.length, tactic: t });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function Highlighted({ text, tactics }: { text: string; tactics: Tactic[] }) {
  const ranges = findRanges(text, tactics);
  const out: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach((r, i) => {
    if (r.start > at) out.push(defang(text.slice(at, r.start)));
    out.push(
      <mark key={i} className="rounded-[2px] bg-hl px-0.5 text-ink" title={r.tactic.label}>
        {defang(text.slice(r.start, r.end))}
        <span className="ml-1 rounded-[2px] bg-ink px-1 align-middle font-sans text-[10px] font-bold tracking-wide text-white uppercase">{r.tactic.label}</span>
      </mark>,
    );
    at = r.end;
  });
  if (at < text.length) out.push(defang(text.slice(at)));
  return <>{out}</>;
}

const SHOWN_HEADERS = ["from", "reply-to", "return-path", "subject"];

export function AnnotatedMessage({ text, tactics, imageUrl }: { text: string; tactics: Tactic[]; imageUrl?: string | null }) {
  const { headers, body } = parseHeaders(text);
  return (
    <section aria-labelledby="exhibit-h" className="rounded-md border-[1.5px] border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-dash px-5 py-3.5">
        <h2 id="exhibit-h" className="eyebrow m-0 font-semibold">
          Exhibit A — annotated
        </h2>
        <span className="font-mono text-xs text-muted">Links defanged · not clickable</span>
      </div>
      <div className="flex flex-col gap-3.5 p-5 font-mono text-[14.5px] leading-[1.75]">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="The screenshot you submitted" className="max-h-80 w-auto self-start rounded border border-line" />
        )}
        {headers && (
          <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[13.5px] text-body">
            {SHOWN_HEADERS.filter((h) => headers[h]).map((h) => (
              <div key={h} className="contents">
                <span className="capitalize">{h}</span>
                <span className="break-all">{defang(headers[h])}</span>
              </div>
            ))}
          </div>
        )}
        {(headers ? body : text) && (
          <p className="m-0 whitespace-pre-wrap break-words">
            <Highlighted text={headers ? body : text} tactics={tactics} />
          </p>
        )}
      </div>
      {tactics.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {tactics.map((t, i) => (
            <span key={i} className="animate-pop rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-white">
              {t.label} · “{t.quote.length > 34 ? `${t.quote.slice(0, 34)}…` : t.quote}”
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function Debate({ debate, running }: { debate: { prosecution?: string; defense?: string; judge?: string }; running: boolean }) {
  const waiting = (label: string) => <p className="m-0 animate-pulse text-[15px] text-faint">{running ? label : "—"}</p>;
  return (
    <section aria-labelledby="debate-h" className="flex flex-col gap-4">
      <h2 id="debate-h" className="condensed m-0 text-[32px] font-black uppercase">
        The case, argued both ways
      </h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <article className="flex flex-col gap-2.5 rounded-md border-[1.5px] border-t-[6px] border-line border-t-alert bg-card p-6">
          <h3 className="m-0 font-mono text-xs tracking-[0.12em] text-alert-deep uppercase">Prosecution</h3>
          {debate.prosecution ? <p className="animate-rise m-0 text-base leading-relaxed text-ink-2">{debate.prosecution}</p> : waiting("Building the case…")}
        </article>
        <article className="flex flex-col gap-2.5 rounded-md border-[1.5px] border-t-[6px] border-line border-t-trust bg-card p-6">
          <h3 className="m-0 font-mono text-xs tracking-[0.12em] text-trust-ink uppercase">Defense</h3>
          {debate.defense ? <p className="animate-rise m-0 text-base leading-relaxed text-ink-2">{debate.defense}</p> : waiting("Looking for an innocent explanation…")}
        </article>
        <article className="flex flex-col gap-2.5 rounded-md bg-night p-6 text-white">
          <h3 className="m-0 font-mono text-xs tracking-[0.12em] text-[#FF8A70] uppercase">Judge</h3>
          {debate.judge ? <p className="animate-rise m-0 text-base leading-relaxed text-[#E6E9EE]">{debate.judge}</p> : waiting("Weighing the evidence…")}
        </article>
      </div>
    </section>
  );
}

export function ResponseKit({ report }: { report: Report }) {
  return (
    <section aria-label="What to do" className="flex flex-wrap items-stretch gap-5">
      {report.verify && (
        <div className="animate-rise flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 rounded-md bg-trust p-7 text-white">
          <p className="m-0 font-mono text-xs tracking-[0.12em] text-[#C9D6FF] uppercase">Verify through a channel you trust</p>
          <h2 className="m-0 text-[30px] leading-[1.05] font-black uppercase" style={{ fontStretch: "72%" }}>
            {report.band === "countersigned" ? `Still unsure? Ask ${report.verify.brand} directly.` : "Don't use anything in this message."}
          </h2>
          <p className="m-0 text-base leading-relaxed text-[#E3E9FB]">{report.verify.note}</p>
          <a
            href={report.verify.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center self-start rounded bg-white px-4.5 font-bold text-trust-ink no-underline"
          >
            Official {report.verify.brand} help ↗
          </a>
        </div>
      )}
      <div className="animate-rise flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 rounded-md border-[1.5px] border-line bg-card p-7">
        <p className="eyebrow m-0">What to do now</p>
        <ol className="m-0 flex flex-col gap-2.5 pl-5.5 text-base leading-normal text-ink-2">
          {report.actions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      </div>
      {report.ifCompromised.length > 0 && (
        <div className="animate-rise flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 rounded-md border-[1.5px] border-[#F2B4A6] bg-alert-soft p-7">
          <p className="m-0 font-mono text-xs tracking-[0.12em] text-alert-deep uppercase">Already clicked, paid or shared details?</p>
          <ol className="m-0 flex flex-col gap-2.5 pl-5.5 text-base leading-normal text-ink-2">
            {report.ifCompromised.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

import type { TimelineItem } from "@/lib/investigator/useInvestigation";

const TOOL_NAMES: Record<string, string> = {
  rdap_lookup: "Domain registry",
  lookalike_check: "Lookalike check",
  dns_check: "DNS records",
  email_auth: "Email authentication",
  trace_url: "Link trace",
  sandbox_scan: "Sandbox browser",
  injection_check: "AI-manipulation check",
  impersonation_check: "Impersonation check",
  overall_judgment: "AI's overall read (one weighted signal)",
  provider_signals: "Mail provider signals",
};

function argText(args: Record<string, unknown>): string {
  const v = args.domain ?? args.url;
  return v ? String(v).replace(/\./g, "[.]").replace(/^http/i, "hxxp") : "";
}

function Badge({ item }: { item: Extract<TimelineItem, { kind: "tool" }> }) {
  const risk = item.findings.filter((f) => f.kind === "risk");
  const trust = item.findings.filter((f) => f.kind === "trust");
  if (risk.length) {
    return (
      <span className="self-start rounded-[3px] bg-alert-wash px-2 py-0.5 font-mono text-xs font-semibold text-alert-deep">
        {risk.map((f) => `+${f.weight.toFixed(2)}`).join(" · ")} · {risk[0].label.toLowerCase()}
      </span>
    );
  }
  if (trust.length) {
    return (
      <span className="self-start rounded-[3px] bg-trust-wash px-2 py-0.5 font-mono text-xs font-semibold text-trust-ink">
        trust · {trust[0].label.toLowerCase()}
      </span>
    );
  }
  return <span className="self-start rounded-[3px] bg-paper px-2 py-0.5 font-mono text-xs font-semibold text-muted">0.00 · {item.findings[0]?.label.toLowerCase() ?? "neutral"}</span>;
}

export function Trace({ timeline, running }: { timeline: TimelineItem[]; running: boolean }) {
  return (
    <section aria-labelledby="trace-h" className="min-w-0 flex-[1_1_380px] rounded-md border-[1.5px] border-line bg-card">
      <div className="flex items-center justify-between border-b border-dashed border-dash px-5 py-3.5">
        <h2 id="trace-h" className="eyebrow m-0 font-semibold">
          Investigation trace
        </h2>
        <span className="flex items-center gap-2 font-mono text-xs text-muted">
          {running && <span className="h-2 w-2 animate-pulse rounded-full bg-alert" />}
          {running ? "live" : `${timeline.filter((t) => t.kind === "tool").length} lookups`}
        </span>
      </div>
      <ol className="m-0 flex list-none flex-col p-5" aria-live="polite">
        {timeline.length === 0 && <li className="font-mono text-sm text-muted">Opening the case file…</li>}
        {timeline.map((item, i) => {
          const last = i === timeline.length - 1;
          if (item.kind === "thought") {
            return (
              <li key={item.key} className={`animate-rise relative ml-[9px] border-l-2 border-line pl-5 ${last ? "" : "pb-4"}`}>
                <span className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-line" />
                <p className="m-0 text-[15px] italic leading-snug text-muted">{item.text}</p>
              </li>
            );
          }
          const hasRisk = item.findings.some((f) => f.kind === "risk");
          const hasTrust = item.findings.some((f) => f.kind === "trust");
          const dot = item.status === "running" ? "bg-dash animate-pulse" : hasRisk ? "bg-alert" : hasTrust ? "bg-trust" : "bg-faint";
          return (
            <li key={item.key} className={`animate-rise relative ml-[9px] border-l-2 pl-5 ${last ? "border-transparent" : "border-line pb-5"}`}>
              <span className={`absolute top-0.5 -left-[9px] h-4 w-4 rounded-full border-2 border-white ${dot}`} />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="font-mono text-[13px] font-semibold break-all">
                  {TOOL_NAMES[item.name] ?? item.name}
                  {argText(item.args) && <span className="font-normal text-muted"> · {argText(item.args)}</span>}
                </span>
                {item.status === "running" ? (
                  <span className="text-[15px] text-faint">checking…</span>
                ) : (
                  <>
                    <span className="text-[15px] leading-snug text-body">
                      {item.findings.find((f) => f.kind !== "neutral")?.detail ?? item.summary}
                    </span>
                    <Badge item={item} />
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

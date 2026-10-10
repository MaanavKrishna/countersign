import type { Band } from "@/lib/core/types";

export const BAND_STYLE: Record<Band, { color: string; ink: string; word: string; wash: string }> = {
  forgery: { color: "#E5381B", ink: "#C42A10", word: "FORGERY", wash: "#FFE0D8" },
  unverified: { color: "#D98A00", ink: "#9A5B00", word: "UNVERIFIED", wash: "#FFF1D6" },
  countersigned: { color: "#1E4FD8", ink: "#163C9E", word: "COUNTERSIGNED", wash: "#E3E9FB" },
};

export function RiskGauge({ risk, band, size = 132 }: { risk: number; band: Band; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  // Evidence is never certainty: cap the display at 99.
  const pct = Math.min(99, Math.round(risk * 100));
  const { color } = BAND_STYLE[band];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Risk ${pct} percent`}>
      <svg width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9EBEE" strokeWidth="14" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - risk)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1), stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="condensed text-[40px] leading-none font-black tabular-nums">{pct}</span>
        <span className="font-mono text-[11px] tracking-[0.1em] text-muted">RISK %</span>
      </div>
    </div>
  );
}

export function Stamp({ band }: { band: Band }) {
  const s = BAND_STYLE[band];
  return (
    <div
      className="animate-stamp rounded-md px-5 py-2.5 text-[42px] leading-none font-black tracking-[0.08em] select-none sm:text-[46px]"
      style={{ border: `5px double ${s.ink}`, color: s.ink, fontStretch: "62%" }}
    >
      {s.word}
    </div>
  );
}

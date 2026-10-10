"use client";

import { useEffect, useState } from "react";
import { STEP_SECONDS, codesForDisplay, type Pairing } from "@/lib/family/protocol";
import { WordsGate } from "./WordsGate";

type Codes = Awaited<ReturnType<typeof codesForDisplay>>;

type Props = { pairing: Pairing; which: "mine" | "theirs"; size?: "md" | "lg" };

export function RollingCode(props: Props) {
  return (
    <WordsGate>
      <PairWords {...props} />
    </WordsGate>
  );
}

function PairWords({ pairing, which, size = "md" }: Props) {
  const [codes, setCodes] = useState<Codes | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => codesForDisplay(pairing, Date.now()).then((c) => alive && setCodes(c));
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pairing]);

  if (!codes) return <div className="h-14 animate-pulse rounded bg-black/5" aria-hidden="true" />;
  const words = which === "mine" ? codes.mine : codes.theirs;
  const alt = which === "theirs" ? (codes.theirsPrevious ?? codes.theirsNext) : null;
  const big = size === "lg";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <p className={`m-0 font-black uppercase ${big ? "text-[40px] sm:text-[56px]" : "text-[28px]"} leading-none tracking-[0.02em]`} style={{ fontStretch: "70%" }} aria-live="polite">
          {words.join(" · ")}
        </p>
        <svg width="34" height="34" viewBox="0 0 34 34" role="img" aria-label={`Changes in ${codes.secondsLeft} seconds`}>
          <circle cx="17" cy="17" r="14" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
          <circle
            cx="17"
            cy="17"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={88}
            strokeDashoffset={88 * (1 - codes.secondsLeft / STEP_SECONDS)}
            transform="rotate(-90 17 17)"
          />
        </svg>
      </div>
      {alt && <p className="m-0 font-mono text-xs opacity-70">Their clock may differ slightly. Also accept: {alt.join(" · ")}</p>}
    </div>
  );
}

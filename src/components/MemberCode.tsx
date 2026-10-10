"use client";

import { useEffect, useState } from "react";
import { memberCodesForDisplay, type Circle } from "@/lib/countersign/circle";
import { LANGS } from "@/lib/countersign/languages";
import { STEP_SECONDS } from "@/lib/countersign/protocol";
import { UI } from "@/lib/countersign/ui";
import { WordsGate } from "./WordsGate";

type Codes = Awaited<ReturnType<typeof memberCodesForDisplay>>;

function speak(words: string[], lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(words.join(", "));
  u.rate = 0.8;
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

type Props = { circle: Circle; member: string; size?: "md" | "lg" | "xl"; readAloud?: boolean };

/** A circle member's rolling words, refreshed every second, behind the optional lock. */
export function MemberCode(props: Props) {
  return (
    <WordsGate>
      <MemberWords {...props} />
    </WordsGate>
  );
}

function MemberWords({ circle, member, size = "md", readAloud = false }: { circle: Circle; member: string; size?: "md" | "lg" | "xl"; readAloud?: boolean }) {
  const [codes, setCodes] = useState<Codes | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const tick = () =>
      memberCodesForDisplay(circle, member, Date.now())
        .then((c) => alive && setCodes(c))
        .catch(() => alive && setFailed(true));
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [circle, member]);

  const ui = UI[circle.lang] ?? UI.en;
  if (!codes && failed) return <p className="m-0 font-semibold">Words unavailable offline. Open this page once with a signal to download this language.</p>;
  if (!codes) return <div className="h-14 animate-pulse rounded bg-black/5" aria-hidden="true" />;
  const text = size === "xl" ? "text-[44px] sm:text-[80px]" : size === "lg" ? "text-[40px] sm:text-[56px]" : "text-[28px]";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <p className={`m-0 font-black uppercase ${text} leading-[0.95] tracking-[0.02em]`} style={{ fontStretch: "70%" }} aria-live="polite">
          {size === "xl" ? codes.words.map((w) => <span key={w} className="block">{w}</span>) : codes.words.join(" · ")}
        </p>
        <svg width="34" height="34" viewBox="0 0 34 34" role="img" aria-label={ui.changesIn(codes.secondsLeft)} className="shrink-0">
          <circle cx="17" cy="17" r="14" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
          <circle cx="17" cy="17" r="14" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={88} strokeDashoffset={88 * (1 - codes.secondsLeft / STEP_SECONDS)} transform="rotate(-90 17 17)" />
        </svg>
      </div>
      {codes.alt && <p className="m-0 font-mono text-xs opacity-70">{ui.alsoAccept} {codes.alt.join(" · ")}</p>}
      {readAloud && (
        <button type="button" onClick={() => speak(codes.words, LANGS[circle.lang].speech)} className="flex min-h-12 items-center gap-2 self-start rounded border-2 border-current px-4 font-bold">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
          </svg>
          {ui.readAloud}
        </button>
      )}
    </div>
  );
}

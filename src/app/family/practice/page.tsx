"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useState, useSyncExternalStore } from "react";
import { normalizeName, memberCodesForDisplay, type Circle } from "@/lib/family/circle";
import { DrillButton } from "@/components/DrillButton";
import { LANGS } from "@/lib/family/languages";
import { useWordsOpen } from "@/lib/family/lock";
import { useFamily } from "@/lib/family/store";
import { SCENARIOS, practiceStep, start, type ScenarioId } from "@/lib/family/practice";

const EXAMPLE_WORDS = ["copper", "lantern", "river"];

const noop = () => () => {};
const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Speak one line. The returned stop() detaches the callbacks before cancelling, so a
 *  cancelled line can never fire its "finished" callback (Safari fires `end` on cancel). */
function say(text: string, lang: string, onEnd?: () => void, onError?: () => void): () => void {
  if (!hasSpeech()) return () => {};
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.lang = lang;
  u.onend = () => onEnd?.();
  u.onerror = (e) => {
    if (e.error !== "interrupted" && e.error !== "canceled") onError?.();
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return () => {
    u.onend = null;
    u.onerror = null;
    window.speechSynthesis.cancel();
  };
}

const LESSON = {
  pass: { title: "You passed.", body: "That's exactly right: ask for the countersign, and if they dodge or get it wrong, hang up and call back on the number you already have." },
  fail: { title: "That's what the scammer wanted.", body: "A real emergency can wait two minutes. Ask for the countersign first. Real family can always read it from their phone." },
  soft: { title: "Safe, but there's a better way.", body: "Hanging up and calling back is never wrong. But here the caller could prove who they were: asking for the countersign first saves the worry." },
};

export default function PracticePage() {
  const { circles, pairings, lock } = useFamily();
  const wordsOpen = useWordsOpen(lock);
  const [state, dispatch] = useReducer(practiceStep, start("jail"));
  const [loadedWords, setWords] = useState<string[]>(EXAMPLE_WORDS);
  const [muted, setMuted] = useState(false);
  const speech = useSyncExternalStore(noop, hasSpeech, () => true);

  // Personalise: the first family member who isn't me. Real words only for a real circle member.
  const circle: Circle | undefined = circles[0];
  const member = circle?.members.find((m) => normalizeName(m) !== normalizeName(circle.me));
  const familyName = member ?? pairings[0]?.them ?? "Ethan";
  // A locked phone practises with example words rather than revealing real ones.
  const realWords = Boolean(circle && member && wordsOpen);
  const words = realWords ? loadedWords : EXAMPLE_WORDS;
  const wordsLang = LANGS[realWords && circle ? circle.lang : "en"].speech;
  const sc = SCENARIOS[state.scenario];
  const fill = useCallback((t: string) => t.replaceAll("{name}", familyName), [familyName]);

  // The genuine caller reads your circle's real current words.
  useEffect(() => {
    if (!circle || !member || !wordsOpen) return;
    let alive = true;
    memberCodesForDisplay(circle, member, Date.now())
      .then((c) => alive && setWords(c.words))
      .catch(() => {}); // keep the example words if the word list can't load offline
    return () => {
      alive = false;
    };
  }, [circle, member, wordsOpen, state.phase]);

  // Speak each step. Cleanup stops the line, so changing step, scenario or page never doubles up.
  // With no voice available, the "Next line" button drives the call instead.
  useEffect(() => {
    const failed = () => setMuted(true);
    if (state.phase === "talking") return say(fill(sc.lines[state.line]), "en-US", () => dispatch({ type: "next" }), failed);
    if (state.phase === "reply" && state.reply) {
      return state.reply === "WORDS" ? say(words.join(", "), wordsLang, undefined, failed) : say(fill(state.reply), "en-US", undefined, failed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak once per step, not when the words tick over
  }, [state.phase, state.line, state.reply, sc, fill]);

  const pick = (id: ScenarioId) => dispatch({ type: "select", scenario: id });

  const caller = fill(sc.caller);
  const btn = "min-h-16 rounded-md px-5 text-left text-xl font-black uppercase";

  return (
    <main className="min-h-screen bg-night text-white">
      <div className="mx-auto flex max-w-[860px] flex-col gap-8 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/family" className="font-bold text-white underline-offset-4 hover:underline">← Family</Link>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Practice scenario">
            {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={state.scenario === id}
                onClick={() => pick(id)}
                className={`min-h-11 rounded-full px-4 text-sm font-bold ${state.scenario === id ? "bg-white text-ink" : "border border-white/40 text-white"}`}
              >
                {SCENARIOS[id].title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="m-0 font-mono text-sm tracking-[0.12em] text-[#AEB6C2] uppercase">Practice call · nothing here is real</p>
          <h1 className="condensed m-0 text-[48px] leading-[0.95] font-black uppercase sm:text-[72px]">
            {state.phase === "ringing" ? "Incoming call" : state.phase === "done" ? LESSON[state.outcome!].title : caller}
          </h1>
        </div>

        {state.phase === "ringing" && (
          <div className="flex flex-col gap-6">
            <p className="m-0 text-xl text-[#D5DAE1]">
              Unknown number. It sounds like {caller}. {speech ? "Turn your sound on, then answer." : "This browser can't speak, so read each line and tap Next."}
            </p>
            <button type="button" onClick={() => dispatch({ type: "answer" })} className="min-h-20 rounded-full bg-[#1F9D55] text-2xl font-black uppercase">
              Answer
            </button>
          </div>
        )}

        {state.phase === "talking" && (
          <div className="flex flex-col gap-5">
            <p className="m-0 rounded-md bg-white/10 p-5 text-2xl leading-snug" aria-live="polite">
              &ldquo;{fill(sc.lines[state.line])}&rdquo;
            </p>
            {muted && <p className="m-0 text-base text-[#AEB6C2]">No sound available. Read the line, then tap Next.</p>}
            <button type="button" onClick={() => dispatch({ type: "next" })} className="self-start text-lg font-bold underline underline-offset-4">
              Next line →
            </button>
          </div>
        )}

        {(state.phase === "decide" || state.phase === "reply") && (
          <div className="flex flex-col gap-5">
            {state.phase === "reply" && (
              <p className="m-0 rounded-md bg-white/10 p-5 text-2xl leading-snug" aria-live="polite">
                {state.reply === "WORDS" ? (
                  <>
                    &ldquo;Sure, it&apos;s <b className="uppercase">{words.join(" · ")}</b>.&rdquo;
                    <span className="mt-2 block text-base text-[#AEB6C2]">{realWords ? "These are your circle's real words right now. Check them on the Family page." : "Example words. Set up a Family Circle to practise with your real ones."}</span>
                  </>
                ) : (
                  <>&ldquo;{fill(state.reply ?? "")}&rdquo;</>
                )}
              </p>
            )}
            <p className="m-0 text-xl font-bold">What do you do?</p>
            <div className="grid grid-cols-1 gap-3">
              {state.phase === "decide" && (
                <button type="button" onClick={() => dispatch({ type: "choose", choice: "ask" })} className={`${btn} bg-white text-ink`}>
                  Ask: &ldquo;What&apos;s our countersign?&rdquo;
                </button>
              )}
              {state.phase === "reply" && state.reply === "WORDS" && (
                <button type="button" onClick={() => dispatch({ type: "choose", choice: "match" })} className={`${btn} bg-trust text-white`}>
                  The words match
                </button>
              )}
              <button type="button" onClick={() => dispatch({ type: "choose", choice: "hangup" })} className={`${btn} border-2 border-white text-white`}>
                Hang up and call back
              </button>
              <button type="button" onClick={() => dispatch({ type: "choose", choice: "send" })} className={`${btn} bg-alert-ink text-white`}>
                {state.scenario === "bank" ? "Read them the code" : "Send the money"}
              </button>
            </div>
          </div>
        )}

        {state.phase === "done" && state.outcome && (
          <div className="flex flex-col gap-6">
            <p className={`m-0 rounded-md p-6 text-xl leading-relaxed ${state.outcome === "fail" ? "bg-alert-ink" : state.outcome === "pass" ? "bg-trust" : "bg-white/15"}`}>{LESSON[state.outcome].body}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => dispatch({ type: "restart" })} className="min-h-14 rounded bg-white px-6 font-extrabold text-ink uppercase">
                Try again
              </button>
              <Link href="/family" className="flex min-h-14 items-center rounded border-2 border-white px-6 font-bold text-white no-underline">
                Back to Family
              </Link>
              <DrillButton className="min-h-14 rounded border-2 border-white/60 px-6 font-bold text-white" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

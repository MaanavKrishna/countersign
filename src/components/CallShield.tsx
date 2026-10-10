"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ShieldAssessment, ShieldStage, Tactic } from "@/lib/types";
import { alertText, smsLink } from "@/lib/countersign/alert";
import { useFamily } from "@/lib/countersign/store";
import { matchesPerson } from "@/lib/people";
import { assessLocally } from "@/lib/shieldLocal";
import { questionsFor, useVault } from "@/lib/vault";
import { MemberCode } from "./MemberCode";
import { RollingCode } from "./RollingCode";
import { normalizeName } from "@/lib/countersign/circle";
import { Logo, Nav } from "./SiteHeader";

// Minimal typing for the Web Speech API (Chrome / Edge / Safari).
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type Recognizer = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognizerCtor = new () => Recognizer;

// "Keep the call on this phone": assess with on-device rules only; no transcript goes to our server.
const LOCAL_KEY = "countersign.shield.local";
const localListeners = new Set<() => void>();
const readLocalPref = () => {
  try {
    return window.localStorage.getItem(LOCAL_KEY) === "1";
  } catch {
    return false;
  }
};
const subscribeLocalPref = (l: () => void) => {
  localListeners.add(l);
  return () => localListeners.delete(l);
};
const writeLocalPref = (on: boolean) => {
  try {
    window.localStorage.setItem(LOCAL_KEY, on ? "1" : "0");
  } catch {
    /* private mode: the toggle still works for this visit via the listeners below */
  }
  localListeners.forEach((l) => l());
};

const SCRIPTS = {
  grandparent: [
    "Grandma? It's me. It's Ethan.",
    "I'm okay, but I'm in trouble. There was an accident and the police took me in.",
    "I'm in jail right now. Please don't tell Mom, she'll freak out.",
    "The lawyer says bail is two thousand dollars and it has to be today.",
    "Can you go to the store and get Apple gift cards and read me the numbers on the back?",
    "Please hurry, they're only letting me use the phone for a few minutes.",
  ],
  genuine: [
    "Hey Grandma, it's Ethan!",
    "I just wanted to tell you I got the internship I applied for.",
    "I'll come by on Sunday for lunch if that's okay with you.",
    "Tell Grandpa I said hi. Love you!",
  ],
} as const;

const STAGE = {
  calm: { bg: "#0E1A2E", panel: "#0A1322", line: "#22324D", hot: "#5B8CFF", text: "#D6E2FF", muted: "#93A6C9", title: "Listening.", sub: "Nothing unusual yet. Countersign flags scam scripts as they unfold." },
  caution: { bg: "#2A1A04", panel: "#1C1102", line: "#5A3B0A", hot: "#FFB020", text: "#FFE7B8", muted: "#C9A86A", title: "Slow down.", sub: "This call has warning signs. Verify who you're talking to before you act." },
  danger: { bg: "#2A0C06", panel: "#1A0703", line: "#5C2A20", hot: "#FF5A3A", text: "#FFD9CF", muted: "#C99A90", title: "Stop. Don't send money.", sub: "" },
} satisfies Record<ShieldStage, unknown>;

type Line = { text: string; final: boolean };

function Highlight({ text, tactics, hot }: { text: string; tactics: Tactic[]; hot: string }) {
  const lower = text.toLowerCase();
  const hit = tactics.find((t) => lower.includes(t.quote.toLowerCase()));
  if (!hit) return <>{text}</>;
  const i = lower.indexOf(hit.quote.toLowerCase());
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[2px] px-0.5 text-ink" style={{ background: hot }}>
        {text.slice(i, i + hit.quote.length)}
      </mark>
      {text.slice(i + hit.quote.length)}
    </>
  );
}

export function CallShield() {
  const { entries } = useVault();
  const canListen = useSyncExternalStore(
    () => () => {},
    () => {
      const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
      return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
    },
    () => true,
  );
  const { pairings, circles, contact } = useFamily();
  const [mode, setMode] = useState<"idle" | "mic" | "sim">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [assessment, setAssessment] = useState<ShieldAssessment | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const localOnly = useSyncExternalStore(subscribeLocalPref, readLocalPref, () => false);
  const localOnlyRef = useRef(localOnly);
  useEffect(() => {
    localOnlyRef.current = localOnly;
  }, [localOnly]);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [outcome, setOutcome] = useState<"passed" | "failed" | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const recognizer = useRef<Recognizer | null>(null);
  const listening = useRef(false);
  const seq = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const linesRef = useRef<Line[]>([]);
  const transcriptBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = transcriptBox.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const analyze = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const transcript = linesRef.current.filter((l) => l.final).map((l) => l.text).join("\n");
      if (transcript.trim().length < 8) return;
      const mine = ++seq.current;
      if (localOnlyRef.current) {
        setAssessment(assessLocally(transcript));
        return;
      }
      setAnalyzing(true);
      try {
        const res = await fetch("/api/shield", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript }) });
        if (!res.ok) throw new Error(String(res.status));
        const a = (await res.json()) as ShieldAssessment;
        if (mine === seq.current) setAssessment(a);
      } catch {
        // Offline or the service is down: keep protecting with the on-device rules.
        if (mine === seq.current) setAssessment(assessLocally(transcript));
      } finally {
        if (mine === seq.current) setAnalyzing(false);
      }
    }, 900);
  }, []);

  const pushLine = useCallback(
    (text: string, final: boolean) => {
      const prev = linesRef.current;
      const last = prev[prev.length - 1];
      const next = last && !last.final ? [...prev.slice(0, -1), { text, final }] : [...prev, { text, final }];
      linesRef.current = next;
      setLines(next);
      if (final) analyze();
    },
    [analyze],
  );

  const stop = useCallback(() => {
    listening.current = false;
    recognizer.current?.stop();
    recognizer.current = null;
    if (simTimer.current) clearInterval(simTimer.current);
    simTimer.current = null;
    if (debounce.current) clearTimeout(debounce.current);
    seq.current++;
    setAnalyzing(false);
    setMode("idle");
  }, []);

  const resetSession = () => {
    linesRef.current = [];
    setLines([]);
    setAssessment(null);
    setOutcome(null);
    setChallengeIdx(0);
    setMicError(null);
    setStartedAt(Date.now());
    setNow(Date.now());
  };

  const startMic = () => {
    const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setMicError("Live listening needs Chrome, Edge or Safari. Try the demo call instead.");
      return;
    }
    resetSession();
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        pushLine(res[0].transcript.trim(), res.isFinal);
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicError("Microphone permission was denied.");
        stop();
      }
    };
    // Browsers end recognition after silence; keep listening until the user stops.
    r.onend = () => {
      if (listening.current) {
        try {
          r.start();
        } catch {
          /* already started */
        }
      }
    };
    recognizer.current = r;
    listening.current = true;
    r.start();
    setMode("mic");
  };

  const startSim = (script: keyof typeof SCRIPTS) => {
    resetSession();
    setMode("sim");
    const lines = SCRIPTS[script];
    let i = 0;
    const tick = () => {
      if (i >= lines.length) {
        if (simTimer.current) clearInterval(simTimer.current);
        return;
      }
      const line = lines[i++];
      // Type the line out briefly as an interim result, then finalize it.
      pushLine(line.split(" ").slice(0, 3).join(" ") + "…", false);
      setTimeout(() => pushLine(line, true), 700);
    };
    tick();
    simTimer.current = setInterval(tick, 3600);
  };

  useEffect(() => {
    if (!startedAt || mode === "idle") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt, mode]);

  useEffect(() => () => stop(), [stop]);

  const stage: ShieldStage = outcome === "failed" ? "danger" : assessment?.stage ?? "calm";
  const s = STAGE[stage];
  const candidates = questionsFor(entries, assessment?.claimedIdentity ?? null);
  const paired = pairings.find((p) => matchesPerson(p.them, assessment?.claimedIdentity ?? null)) ?? null;
  const circleHit =
    circles
      .flatMap((c) => c.members.filter((m) => normalizeName(m) !== normalizeName(c.me)).map((member) => ({ circle: c, member })))
      .find((x) => matchesPerson(x.member, assessment?.claimedIdentity ?? null)) ?? null;
  const question = candidates.length ? candidates[challengeIdx % candidates.length] : null;
  const showChallenge = !!assessment && (assessment.challengeNow || stage === "danger") && outcome === null;
  const who = assessment?.claimedIdentity ?? "them";
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const active = mode !== "idle";

  return (
    <div className="min-h-screen transition-colors duration-700" style={{ background: s.bg, color: "#fff" }}>
      <header className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8">
        <Logo tone="dark" />
        <div className="flex flex-wrap items-center gap-3">
          {active ? (
            <>
              <span className="flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 font-mono text-[13px]" style={{ borderColor: s.hot }}>
                <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: s.hot }} />
                {mode === "sim" ? "Demo call" : "Listening"} · {clock}
              </span>
              <button type="button" onClick={stop} className="min-h-11 rounded-full border-[1.5px] border-white px-4.5 text-[15px] font-bold hover:bg-white/10">
                End session
              </button>
            </>
          ) : (
            <Nav tone="dark" />
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-[1360px] flex-col gap-7 px-4 pt-2 pb-16 sm:px-8">
        <div role="img" aria-label={`Threat stage: ${stage}`} className="grid grid-cols-3 gap-1.5">
          {(["calm", "caution", "danger"] as const).map((k, i) => {
            const reached = ["calm", "caution", "danger"].indexOf(stage) >= i;
            return (
              <div key={k} className="flex flex-col gap-2">
                <div className="h-2.5 rounded-[2px] transition-colors duration-500" style={{ background: reached ? STAGE[k].hot : s.line }} />
                <span className="font-mono text-xs tracking-[0.12em] uppercase" style={{ color: k === stage ? "#fff" : s.muted }}>
                  {k}
                </span>
              </div>
            );
          })}
        </div>

        {!active && lines.length === 0 ? (
          <section className="flex flex-wrap items-start gap-8">
            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
              <h1 className="condensed m-0 text-[56px] leading-[0.9] font-black uppercase sm:text-[84px]">
                Call Shield.
                <br />
                Prove it&apos;s really them.
              </h1>
              <p className="m-0 max-w-[640px] text-xl leading-normal" style={{ color: s.text }}>
                Put the call on speaker and start listening. Countersign spots scam scripts as they unfold and gives you a question a voice clone can&apos;t answer.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={startMic} className="flex min-h-14 items-center gap-2.5 rounded bg-white px-6 text-lg font-extrabold tracking-[0.04em] text-ink uppercase">
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
                  </svg>
                  Start listening
                </button>
                <button type="button" onClick={() => startSim("grandparent")} className="min-h-14 rounded border-[1.5px] border-white px-5 text-base font-bold hover:bg-white/10">
                  Play demo: “grandson in jail” call
                </button>
                <button type="button" onClick={() => startSim("genuine")} className="min-h-14 rounded px-4 text-base font-bold underline-offset-4 hover:underline" style={{ color: s.text }}>
                  Play demo: genuine call
                </button>
              </div>
              <label className="flex max-w-[640px] cursor-pointer items-start gap-3 rounded bg-white/10 p-3 text-base">
                <input type="checkbox" checked={localOnly} onChange={(e) => writeLocalPref(e.target.checked)} className="mt-1 h-5 w-5 flex-none" />
                <span>
                  <b>Keep the call on this phone.</b> Uses built-in scam-script rules instead of our AI, so no transcript is sent to our server. Less nuanced, works offline. (Your browser&apos;s speech recognition may still use its own cloud service: Chrome sends audio to Google.)
                </span>
              </label>
              {micError && <p className="m-0 rounded bg-white/10 px-3 py-2 text-sm">{micError}</p>}
              {!canListen && (
                <p className="m-0 rounded bg-white/10 px-3 py-2 text-sm">Live listening needs Chrome, Edge or Safari. The demo calls work everywhere.</p>
              )}
              <p className="m-0 max-w-[640px] text-base" style={{ color: s.text }}>
                You don&apos;t need Call Shield to stay safe. On any phone, open{" "}
                <Link href="/family?check=1" className="font-bold text-white underline underline-offset-4">
                  Family → Who&apos;s calling?
                </Link>{" "}
                and ask for the countersign.
              </p>
            </div>
            <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-3 rounded-md border-[1.5px] p-6" style={{ borderColor: s.line, background: s.panel }}>
              <p className="m-0 font-mono text-xs tracking-[0.12em] uppercase" style={{ color: s.muted }}>
                Family Countersign
              </p>
              <p className="m-0 text-[17px] leading-normal">
                {pairings.length > 0
                  ? `Paired with ${pairings.map((p) => p.them).join(", ")}. If they "call", Countersign shows the words they must say.`
                  : "Pair phones with family so a cloned voice can't pass as them."}
              </p>
              <Link href="/family" className="self-start font-bold text-white underline-offset-4 hover:underline">
                {pairings.length > 0 ? "Manage family →" : "Pair a family member →"}
              </Link>
              <p className="m-0 mt-3 font-mono text-xs tracking-[0.12em] uppercase" style={{ color: s.muted }}>
                Memory Vault
              </p>
              <p className="m-0 text-[17px] leading-normal">
                {entries.length > 0 ? `${entries.length} challenge question${entries.length === 1 ? "" : "s"} ready, stored only on this device.` : "No challenge questions yet. Add a few before you need them."}
              </p>
              <Link href="/vault" className="self-start font-bold text-white underline-offset-4 hover:underline">
                {entries.length > 0 ? "Manage vault →" : "Set up your vault →"}
              </Link>
            </aside>
          </section>
        ) : (
          <div className="flex flex-wrap items-stretch gap-7">
            <section className="flex min-w-0 flex-[999_1_600px] flex-col gap-6" aria-live="polite">
              <h1 className="condensed m-0 text-[56px] leading-[0.9] font-black uppercase sm:text-[92px]">
                {outcome === "failed" ? "Hang up now." : outcome === "passed" ? "Answer matched." : s.title}
              </h1>
              <p className="m-0 max-w-[660px] text-[21px] leading-normal" style={{ color: s.text }}>
                {outcome === "failed"
                  ? `A real ${who} would know that. Hang up and call back on the number you already have saved.`
                  : outcome === "passed"
                    ? "Good sign — but if they still ask for gift cards, crypto or a wire transfer, hang up and call back on their saved number."
                    : assessment?.advice ?? s.sub}
              </p>

              {showChallenge && (
                <div className="animate-pop flex flex-col gap-4 rounded-md bg-white p-7 text-ink" style={{ boxShadow: `10px 10px 0 ${s.hot}` }}>
                  <p className="m-0 font-mono text-xs tracking-[0.12em] text-alert-deep uppercase">
                    {paired ? "Countersign challenge · from your paired phones" : circleHit ? `Countersign challenge · ${circleHit.circle.name}` : "Countersign challenge · from your Memory Vault"}
                  </p>
                  {paired ? (
                    <>
                      <p className="m-0 text-lg text-body">
                        Ask: <b>&ldquo;{paired.them}, what&apos;s our countersign?&rdquo;</b> The real {paired.them} will read it from their phone.
                      </p>
                      <p className="m-0 font-mono text-xs tracking-[0.12em] text-trust-ink uppercase">They should say</p>
                      <div className="text-ink">
                        <RollingCode pairing={paired} which="theirs" size="lg" />
                      </div>
                      <p className="m-0 text-[15px] text-muted">A cloned voice can&apos;t know these words. They change every minute.</p>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => setOutcome("passed")} className="min-h-[52px] rounded border-2 border-ink px-5.5 font-extrabold tracking-[0.04em] uppercase">
                          Words match
                        </button>
                        <button type="button" onClick={() => setOutcome("failed")} className="min-h-[52px] rounded bg-alert-ink px-5.5 font-extrabold tracking-[0.04em] text-white uppercase">
                          Wrong or refused
                        </button>
                      </div>
                    </>
                  ) : circleHit ? (
                    <>
                      <p className="m-0 text-lg text-body">
                        Ask: <b>&ldquo;{circleHit.member}, what&apos;s our countersign?&rdquo;</b> The real {circleHit.member} will read it from their phone.
                      </p>
                      <p className="m-0 font-mono text-xs tracking-[0.12em] text-trust-ink uppercase">They should say</p>
                      <div className="text-ink">
                        <MemberCode circle={circleHit.circle} member={circleHit.member} size="lg" readAloud />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => setOutcome("passed")} className="min-h-[52px] rounded border-2 border-ink px-5.5 font-extrabold tracking-[0.04em] uppercase">
                          Words match
                        </button>
                        <button type="button" onClick={() => setOutcome("failed")} className="min-h-[52px] rounded bg-alert-ink px-5.5 font-extrabold tracking-[0.04em] text-white uppercase">
                          Wrong or refused
                        </button>
                      </div>
                    </>
                  ) : question ? (
                    <>
                      <p className="m-0 text-lg text-body">Ask {assessment?.claimedIdentity ? `“${assessment.claimedIdentity}”` : "the caller"} this — out loud, word for word:</p>
                      <p className="m-0 text-[32px] leading-[1.05] font-black sm:text-[44px]" style={{ fontStretch: "75%" }}>
                        “{question.question}”
                      </p>
                      <p className="m-0 text-[15px] text-muted">
                        Only you can check the answer{question.hint ? ` (your hint: ${question.hint})` : ""}. It never leaves this device.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => setOutcome("passed")} className="min-h-[52px] rounded border-2 border-ink px-5.5 font-extrabold tracking-[0.04em] uppercase">
                          They got it right
                        </button>
                        <button type="button" onClick={() => setOutcome("failed")} className="min-h-[52px] rounded bg-alert-ink px-5.5 font-extrabold tracking-[0.04em] text-white uppercase">
                          They dodged it
                        </button>
                        {candidates.length > 1 && (
                          <button type="button" onClick={() => setChallengeIdx((i) => i + 1)} className="min-h-[52px] rounded px-5.5 font-bold text-trust">
                            Another question
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="m-0 text-[28px] leading-[1.1] font-black sm:text-[36px]" style={{ fontStretch: "75%" }}>
                        Hang up and call {who} back on the number you already have.
                      </p>
                      <p className="m-0 text-[15px] text-muted">
                        Next time, Countersign can hand you a question only they could answer. <Link href="/vault" className="font-bold text-trust">Set up your Memory Vault →</Link>
                      </p>
                    </>
                  )}
                </div>
              )}

              {stage === "danger" && contact && (
                <a
                  href={smsLink(contact.phone, alertText(assessment?.claimedIdentity ?? null, assessment?.tactics ?? []))}
                  className="flex min-h-14 items-center gap-3 self-start rounded border-2 border-white px-5 text-lg font-extrabold no-underline hover:bg-white/10"
                  style={{ color: "#fff" }}
                >
                  Break the secrecy: text {contact.name} now →
                </a>
              )}

              {assessment && assessment.tactics.length > 0 && (
                <div className="flex flex-wrap gap-2.5">
                  {assessment.claimedIdentity && <span className="rounded-full bg-white px-3.5 py-2 text-sm font-bold text-ink">Claimed: {assessment.claimedIdentity}</span>}
                  {assessment.tactics.slice(-6).map((t, i) => (
                    <span key={i} className="animate-pop rounded-full px-3.5 py-2 text-sm font-semibold" style={{ background: s.line }}>
                      {t.label} · “{t.quote}”
                    </span>
                  ))}
                </div>
              )}
            </section>

            <aside aria-labelledby="tx-h" className="flex min-w-0 flex-[1_1_380px] flex-col rounded-md border-[1.5px]" style={{ background: s.panel, borderColor: s.line }}>
              <div className="flex justify-between border-b px-5 py-3.5" style={{ borderColor: s.line }}>
                <h2 id="tx-h" className="m-0 font-mono text-xs font-semibold tracking-[0.12em] uppercase" style={{ color: s.muted }}>
                  Live transcript
                </h2>
                <span className="font-mono text-xs" style={{ color: s.muted }}>
                  {analyzing ? "analyzing…" : assessment?.source === "device" ? "checked on this phone" : assessment?.source === "rules" ? "built-in rules" : mode === "sim" ? "simulated call" : "live speech"}
                </span>
              </div>
              <div ref={transcriptBox} className="flex max-h-[460px] flex-col gap-4 overflow-y-auto scroll-smooth p-5 text-base leading-normal">
                {lines.length === 0 && <p className="m-0 italic" style={{ color: s.muted }}>Waiting for speech…</p>}
                {lines.map((l, i) => (
                  <p key={i} className="animate-rise m-0" style={{ color: l.final ? (i === lines.length - 1 ? "#fff" : s.text) : s.muted }}>
                    <b className="font-mono text-xs text-white">CALL</b>
                    <br />
                    <Highlight text={l.text} tactics={assessment?.tactics ?? []} hot={s.hot} />
                  </p>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t px-5 py-4.5" style={{ borderColor: s.line }}>
                <span className="font-mono text-xs tracking-[0.12em] uppercase" style={{ color: s.muted }}>
                  Safe exit
                </span>
                <span className="text-base leading-normal">Hang up and call back on the number you have saved. A real emergency will still be real in two minutes.</span>
              </div>
            </aside>
          </div>
        )}
        {!active && lines.length > 0 && (
          <button type="button" onClick={() => { resetSession(); setStartedAt(null); }} className="self-start font-bold underline-offset-4 hover:underline">
            ← Start a new session
          </button>
        )}
      </main>
    </div>
  );
}

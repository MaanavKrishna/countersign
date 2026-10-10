"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { defang } from "@/lib/core/domain";
import { decodeQrFromImage, isFamilySecretLink, qrNote } from "@/lib/investigator/qr";
import { SAMPLES } from "@/lib/investigator/samples";
import { useInvestigation, type ImageInput } from "@/lib/investigator/useInvestigation";
import { AnnotatedMessage, Debate, ResponseKit } from "./CaseParts";
import { EvidenceGraph } from "./EvidenceGraph";
import { Trace } from "./Trace";
import { BAND_STYLE, RiskGauge, Stamp } from "./Verdict";

/** Downscale large screenshots so they stay well under the 4MB upload cap. */
async function toImageInput(file: File): Promise<ImageInput> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // "Quishing": a QR code in the screenshot hides a link the text never shows.
  const qr = await decodeQrFromImage(img);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  return { mediaType: "image/jpeg", base64: dataUrl.split(",")[1], previewUrl: url, qr };
}

export function Investigator({ initialText = "", autorun = false }: { initialText?: string; autorun?: boolean }) {
  const { state, run, reset } = useInvestigation();
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState<ImageInput>(null);
  const [blocked, setBlocked] = useState(false);
  const [submitted, setSubmitted] = useState<{ text: string; image: ImageInput } | null>(
    autorun && initialText.trim() ? { text: initialText, image: null } : null,
  );
  // Shared from another app (Android share sheet): start investigating straight away.
  const autoran = useRef(false);
  useEffect(() => {
    if (autorun && initialText.trim() && !autoran.current) {
      autoran.current = true;
      void run(initialText, null);
    }
  }, [autorun, initialText, run]);
  const fileRef = useRef<HTMLInputElement>(null);

  const start = (t: string, img: ImageInput) => {
    if (!t.trim() && !img) return;
    const full = (t + qrNote(img?.qr ?? null)).trim();
    setSubmitted({ text: full, image: img });
    window.scrollTo({ top: 0, behavior: "smooth" });
    void run(full, img);
  };

  const onFiles = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const img = await toImageInput(f);
    // A family QR code carries the family secret: never upload it, not even the picture.
    const family = isFamilySecretLink(img?.qr ?? null);
    setBlocked(family);
    setImage(family ? null : img);
  };

  if (state.status === "idle" || !submitted) {
    return (
      <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-12 px-4 pt-6 pb-20 sm:px-8 sm:pt-10">
        <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <div className="flex flex-col gap-4">
            <p className="eyebrow m-0 text-[13px]">AI fraud investigator · Exhibit intake</p>
            <h1 className="condensed m-0 text-[52px] leading-[0.95] font-black tracking-[-0.01em] uppercase sm:text-[76px]">
              Something feel off?
              <br />
              We&apos;ll check every claim.
            </h1>
            <p className="m-0 max-w-[620px] text-[19px] leading-normal text-body">
              Paste an email, text or listing, or drop in a screenshot. Countersign looks up the sender, the domains and the links for real, then shows you exactly why it&apos;s a forgery or genuine.
            </p>
          </div>

          <form
            className="flex flex-col rounded-md border-2 border-ink bg-card shadow-block"
            onSubmit={(e) => {
              e.preventDefault();
              start(text, image);
            }}
          >
            <div className="eyebrow flex justify-between border-b border-dashed border-dash px-4.5 py-3 text-[12px]">
              <span>Exhibit A — suspicious message</span>
              <span className="hidden sm:inline">Untrusted · never opened</span>
            </div>
            <label htmlFor="exhibit" className="sr-only">
              Suspicious message
            </label>
            <textarea
              id="exhibit"
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
                if (f) {
                  e.preventDefault();
                  void toImageInput(f).then(setImage);
                }
              }}
              placeholder="Paste the full message here. For emails, include the headers if you can (Gmail: ⋮ › Show original). You can also paste a screenshot."
              className="min-h-[220px] resize-y border-0 bg-transparent p-4.5 font-mono text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint"
            />
            {image && (
              <div className="flex flex-col gap-2 px-4.5 pb-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt="Screenshot to investigate" className="h-16 w-auto rounded border border-line" />
                  <button type="button" onClick={() => setImage(null)} className="min-h-11 rounded px-3 text-sm font-semibold text-alert-ink hover:bg-alert-soft">
                    Remove screenshot
                  </button>
                </div>
                {image.qr && <p className="m-0 font-mono text-xs font-semibold break-all text-alert-ink">QR code found: {defang(image.qr)}. It will be investigated too.</p>}
              </div>
            )}
            {blocked && (
              <p role="alert" className="m-0 border-t border-dashed border-dash bg-alert-soft px-4.5 py-3.5 font-semibold text-alert-deep">
                That screenshot contains a family QR code. It carries your family&apos;s secret, so it wasn&apos;t sent anywhere. Never share it.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-dash px-4.5 py-3.5">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" id="shot" onChange={(e) => void onFiles(e.target.files)} />
              <label
                htmlFor="shot"
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded border-[1.5px] border-dashed border-faint bg-[#F4F5F7] px-4 text-[15px] font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Add screenshot
              </label>
              <button
                type="submit"
                disabled={!text.trim() && !image}
                className="flex min-h-[52px] items-center gap-2.5 rounded bg-alert px-7 text-lg font-extrabold tracking-[0.06em] text-white uppercase transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ fontStretch: "85%" }}
              >
                Investigate
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-3">
            <p className="eyebrow m-0">Try a real-world case file</p>
            <div className="flex flex-wrap gap-2.5">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setText(s.text);
                    setImage(null);
                    start(s.text, null);
                  }}
                  className="min-h-11 rounded-full border-[1.5px] border-ink bg-card px-4 text-[15px] font-semibold transition-colors hover:bg-ink hover:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <Link href="/family" className="group flex flex-col gap-3 rounded-md border-2 border-ink bg-card p-7 no-underline shadow-block">
            <span className="eyebrow text-trust-ink">New · works offline</span>
            <span className="condensed text-[34px] leading-none font-black text-ink uppercase">Family Countersign</span>
            <span className="text-base leading-normal text-body">
              AI can fake a voice. It can&apos;t fake your secret. Pair phones once, then both show the same three words, changing every minute.
            </span>
            <span className="font-mono text-lg font-bold tracking-wide text-trust-ink" aria-hidden="true">COPPER · LANTERN · RIVER</span>
            <span className="text-[15px] font-bold text-ink group-hover:underline">Pair your family →</span>
          </Link>
          {process.env.NEXT_PUBLIC_INBOX_ADDRESS && (
            <div className="flex flex-col gap-2 rounded-md border-[1.5px] border-line bg-card p-6">
              <span className="eyebrow">Got it by email?</span>
              <span className="condensed text-[26px] leading-none font-black uppercase">Forward it</span>
              <span className="text-[15px] leading-normal text-body">
                Send any suspicious email to <b className="font-mono break-all text-ink">{process.env.NEXT_PUBLIC_INBOX_ADDRESS}</b> and get the full case file back by email.
              </span>
            </div>
          )}
          <Link href="/shield" className="group flex flex-col gap-3.5 rounded-md bg-night p-7 text-white no-underline">
            <span className="flex items-center gap-2.5 font-mono text-xs tracking-[0.12em] text-[#FF8A70] uppercase">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
              </svg>
              On a call right now?
            </span>
            <span className="condensed text-[34px] leading-none font-black uppercase">Call Shield</span>
            <span className="text-base leading-normal text-[#D5DAE1]">
              Put the call on speaker. Countersign spots the scam script as it unfolds and shows the countersign the real person must say.
            </span>
            <span className="text-[15px] font-bold group-hover:underline">Start listening →</span>
          </Link>
          <div className="flex flex-col gap-4.5 rounded-md border-[1.5px] border-line bg-card p-6">
            <p className="eyebrow m-0">How a case is built</p>
            {[
              ["An AI investigator", "pulls domain records, DNS, email authentication and redirect chains, live."],
              ["Every finding is weighed", "by a transparent scoring model, not by the AI's gut feeling."],
              ["A defense agent argues it's genuine", "before the verdict is stamped, so real messages aren't flagged by mistake."],
            ].map(([b, rest], i) => (
              <div key={i} className="flex items-start gap-3.5">
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border-[1.5px] border-ink font-mono text-[13px] font-semibold">0{i + 1}</span>
                <span className="text-[15px] leading-normal text-body">
                  <b className="text-ink">{b}</b> {rest}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </main>
    );
  }

  const running = state.status === "running";
  const report = state.report;
  const band = report?.band ?? state.band;
  const toolCount = state.timeline.filter((t) => t.kind === "tool").length;
  const findingCount = state.timeline.reduce((n, t) => n + (t.kind === "tool" ? t.findings.filter((f) => f.kind !== "neutral").length : 0), 0) + state.tactics.length;

  return (
    <main className="mx-auto flex max-w-[1360px] flex-col gap-8 px-4 pt-4 pb-20 sm:px-8">
      <section
        className="flex flex-wrap items-center justify-between gap-8 rounded-md border-2 border-ink bg-card p-6 shadow-block sm:p-8"
        aria-live="polite"
        style={report ? { boxShadow: `8px 8px 0 ${BAND_STYLE[band].ink}` } : undefined}
      >
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-3">
          <p className="eyebrow m-0 text-[13px]">
            {running ? "Investigation in progress" : "Case closed"} · {toolCount} lookups · {findingCount} findings
            {state.elapsedMs ? ` · ${(state.elapsedMs / 1000).toFixed(1)}s` : ""}
          </p>
          <h1 className="condensed m-0 text-[44px] leading-[0.98] font-black uppercase sm:text-[56px]">
            {report ? report.headline : running ? "Checking every claim…" : "Investigation stopped."}
          </h1>
          <p className="m-0 max-w-[680px] text-lg leading-relaxed text-body">
            {report
              ? report.summary
              : state.timeline.filter((t) => t.kind === "thought").at(-1)?.text ?? "Extracting senders, domains, links and payment requests from the message."}
          </p>
          {report?.scamType && <p className="m-0 font-mono text-sm font-semibold text-muted">Classification: {report.scamType}</p>}
          {report?.reviewNote && (
            <p className="m-0 max-w-[680px] rounded border border-amber bg-amber-wash px-3 py-2 text-sm text-ink">
              <b>Judge&apos;s note:</b> {report.reviewNote}
            </p>
          )}
          {state.errors.length > 0 && (
            <p className="m-0 max-w-[680px] rounded border border-line bg-paper px-3 py-2 text-sm text-muted">{state.errors.at(-1)}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                reset();
                setSubmitted(null);
              }}
              className="min-h-11 rounded border-[1.5px] border-ink px-4 font-bold hover:bg-ink hover:text-white"
            >
              {running ? "Cancel" : "New case"}
            </button>
          </div>
        </div>
        <div className="flex flex-[1_1_280px] items-center justify-end gap-7">
          <RiskGauge risk={state.risk} band={band} />
          {report ? <Stamp key={report.band} band={report.band} /> : <div className="h-[72px] w-[200px] animate-pulse rounded-md border-[5px] border-double border-line" aria-hidden="true" />}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-8">
          <AnnotatedMessage text={submitted.text} tactics={state.tactics} imageUrl={submitted.image?.previewUrl} />
          <EvidenceGraph nodes={state.nodes} edges={state.edges} />
          {state.screenshot && (
            <section className="rounded-md border-[1.5px] border-line bg-card p-5">
              <p className="eyebrow m-0 mb-3">Sandbox view — rendered remotely, never on your device</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.screenshot.src} alt="Screenshot of the linked page taken in a remote sandbox" className="w-full rounded border border-line" />
            </section>
          )}
        </div>
        <Trace timeline={state.timeline} running={running} />
      </div>

      {(state.debate.prosecution || state.debate.defense || report || running) && <Debate debate={state.debate} running={running} />}
      {report && <ResponseKit report={report} />}
    </main>
  );
}

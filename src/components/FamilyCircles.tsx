"use client";

import QRCode from "qrcode";
import { useState } from "react";
import { circleJoinLink, normalizeName, type Circle } from "@/lib/countersign/circle";
import { newSecret } from "@/lib/countersign/protocol";
import { useFamily } from "@/lib/countersign/store";
import { MemberCode } from "./MemberCode";

/** Full-screen check for the person receiving the call. Built for grandparents: huge type, one decision. */
function WhoIsCalling({ circle, onClose }: { circle: Circle; onClose: () => void }) {
  const [who, setWho] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<"match" | "nomatch" | null>(null);
  const others = circle.members.filter((m) => normalizeName(m) !== normalizeName(circle.me));

  return (
    <section aria-label="Who's calling?" className="fixed inset-0 z-50 overflow-y-auto bg-night text-white">
      <div className="mx-auto flex min-h-full max-w-[900px] flex-col gap-8 px-5 py-8">
        <div className="flex items-center justify-between gap-4">
          <p className="m-0 font-mono text-sm tracking-[0.12em] text-[#AEB6C2] uppercase">{circle.name}</p>
          <button type="button" onClick={onClose} className="min-h-12 rounded-full border-2 border-white px-5 text-lg font-bold">
            Close
          </button>
        </div>

        {!who ? (
          <>
            <h1 className="condensed m-0 text-[52px] leading-[0.95] font-black uppercase sm:text-[80px]">Who says they&apos;re calling?</h1>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {others.map((m) => (
                <button key={m} type="button" onClick={() => setWho(m)} className="min-h-24 rounded-md bg-white px-6 text-left text-[36px] font-black text-ink uppercase" style={{ fontStretch: "75%" }}>
                  {m}
                </button>
              ))}
            </div>
          </>
        ) : verdict === null ? (
          <>
            <p className="m-0 text-[24px] leading-snug">
              Ask: <b>&ldquo;{who}, what&apos;s our countersign?&rdquo;</b>
              <br />
              The real {who} reads it from their phone. They should say:
            </p>
            <div className="rounded-md bg-white p-6 text-ink sm:p-8">
              <MemberCode circle={circle} member={who} size="xl" readAloud />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setVerdict("match")} className="min-h-20 rounded-md bg-trust text-2xl font-black text-white uppercase">
                The words match
              </button>
              <button type="button" onClick={() => setVerdict("nomatch")} className="min-h-20 rounded-md bg-alert-ink text-2xl font-black text-white uppercase">
                Wrong, or they won&apos;t say
              </button>
            </div>
            <button type="button" onClick={() => setWho(null)} className="self-start text-lg font-bold underline underline-offset-4">
              ← Someone else
            </button>
          </>
        ) : verdict === "match" ? (
          <div className="flex flex-col gap-5">
            <h1 className="condensed m-0 text-[56px] leading-[0.95] font-black uppercase sm:text-[84px]">It&apos;s really {who}.</h1>
            <p className="m-0 text-[22px] leading-normal text-[#D6E2FF]">
              The words match. If they still ask for gift cards, crypto or a wire transfer, call them back on the number you have saved anyway.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <h1 className="condensed m-0 text-[56px] leading-[0.95] font-black uppercase sm:text-[84px]">Hang up now.</h1>
            <p className="m-0 text-[22px] leading-normal text-[#FFD9CF]">
              The real {who} would know the words. This is very likely a scam using a copied voice. Hang up and call {who} on the number you already have. Don&apos;t send money.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function FamilyCircles() {
  const { circles, addCircle, removeCircle } = useFamily();
  const [name, setName] = useState("");
  const [me, setMe] = useState("");
  const [others, setOthers] = useState("");
  const [invite, setInvite] = useState<{ circle: Pick<Circle, "name">; qr: string; link: string } | null>(null);
  const [checking, setChecking] = useState<Circle | null>(null);
  const [copied, setCopied] = useState(false);

  const showInvite = async (c: Pick<Circle, "secret" | "name" | "members" | "lang">) => {
    const link = circleJoinLink(window.location.origin, c);
    setCopied(false);
    setInvite({ circle: c, link, qr: await QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: "M" }) });
  };

  const create = async () => {
    const members = [me.trim(), ...others.split(",").map((s) => s.trim()).filter(Boolean)];
    if (!name.trim() || !me.trim() || members.length < 2) return;
    const c = { name: name.trim(), secret: newSecret(), members, me: me.trim(), lang: "en" as const };
    addCircle(c);
    await showInvite(c);
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="circles-h">
      {checking && <WhoIsCalling circle={checking} onClose={() => setChecking(null)} />}
      <div className="flex flex-col gap-2">
        <h2 id="circles-h" className="condensed m-0 text-[34px] font-black uppercase">Family Circle</h2>
        <p className="m-0 max-w-[760px] text-body">One QR code for the whole family. Everyone scans it once, picks their name, and gets their own three words. Anyone in the circle can then check anyone else.</p>
      </div>

      {circles.map((c) => (
        <article key={c.id} className="flex flex-col gap-5 rounded-md border-2 border-ink bg-card p-6 shadow-block">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="condensed m-0 text-[30px] font-black uppercase">{c.name}</h3>
              <p className="m-0 text-sm text-muted">You are {c.me} · {c.members.length} members</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void showInvite(c)} className="min-h-11 rounded border-[1.5px] border-ink px-3 text-sm font-bold">
                Add someone
              </button>
              <button type="button" onClick={() => removeCircle(c.id)} className="min-h-11 rounded px-3 text-sm font-semibold text-muted hover:text-alert-ink">
                Leave
              </button>
            </div>
          </div>
          <button type="button" onClick={() => setChecking(c)} className="flex min-h-20 items-center justify-center rounded-md bg-ink text-[28px] font-black text-white uppercase" style={{ fontStretch: "75%" }}>
            Who&apos;s calling? Check now →
          </button>
          <div className="flex flex-col gap-1 rounded bg-paper p-4">
            <p className="eyebrow m-0">Your words, only when you call family</p>
            <MemberCode circle={c} member={c.me} />
            <p className="m-0 text-sm text-muted">Never read words to someone who called you. Family only ever asks for them.</p>
          </div>
        </article>
      ))}

      <div className="flex flex-wrap items-start gap-8">
        <form
          className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-md border-[1.5px] border-line bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <h3 className="condensed m-0 text-2xl font-black uppercase">Start a family circle</h3>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Circle name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Krishna family" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Your name (what family calls you)
            <input value={me} onChange={(e) => setMe(e.target.value)} placeholder="Grandma" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Everyone else, separated by commas
            <input value={others} onChange={(e) => setOthers(e.target.value)} placeholder="Ethan, Priya, Dad" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <button type="submit" disabled={!name.trim() || !me.trim() || !others.trim()} className="min-h-12 self-start rounded bg-ink px-5 font-extrabold tracking-[0.06em] text-white uppercase disabled:opacity-50">
            Create circle
          </button>
        </form>

        {invite && (
          <div className="animate-pop flex min-w-0 flex-[1_1_380px] flex-col items-start gap-3 rounded-md border-2 border-ink bg-card p-6 shadow-block">
            <p className="eyebrow m-0">Each family member scans this with their phone camera</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={invite.qr} alt={`Join QR code for ${invite.circle.name}`} width={320} height={320} className="rounded border border-line" />
            <p className="m-0 text-sm text-muted">Share it in person. Anyone who sees this code could join. Close it when everyone has scanned.</p>
            <button type="button" onClick={() => void navigator.clipboard.writeText(invite.link).then(() => setCopied(true))} className="min-h-11 rounded px-3 text-sm font-semibold text-trust hover:bg-trust-wash">
              {copied ? "Link copied" : "Copy link instead (only send it over a channel you trust)"}
            </button>
            <button type="button" onClick={() => setInvite(null)} className="min-h-11 rounded border-[1.5px] border-ink px-4 font-bold">
              Done
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

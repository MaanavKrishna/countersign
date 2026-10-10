"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_MEMBERS, MAX_NAME, circleJoinLink, cleanMembers, cleanName, normalizeName, secretTag, type Circle } from "@/lib/family/circle";
import { LANGS, type Lang } from "@/lib/family/languages";
import { newSecret } from "@/lib/family/protocol";
import { useFamily } from "@/lib/family/store";
import { UI } from "@/lib/family/ui";
import { ensureOpen, useWordsOpen } from "@/lib/family/lock";
import { MemberCode } from "./MemberCode";

/** Full-screen check for the person receiving the call. Built for grandparents: huge type, one decision. */
function WhoIsCalling({ circle, onClose }: { circle: Circle; onClose: () => void }) {
  const [who, setWho] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<"match" | "nomatch" | null>(null);
  const others = circle.members.filter((m) => normalizeName(m) !== normalizeName(circle.me));
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = UI[circle.lang] ?? UI.en;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  // Focus Close once on open; Escape closes.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section role="dialog" aria-modal="true" aria-label={t.dialogLabel} lang={circle.lang} className="fixed inset-0 z-50 overflow-y-auto bg-night text-white">
      <div className="mx-auto flex min-h-full max-w-[900px] flex-col gap-8 px-5 py-8">
        <div className="flex items-center justify-between gap-4">
          <p className="m-0 font-mono text-sm tracking-[0.12em] text-[#AEB6C2] uppercase">{circle.name}</p>
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-12 rounded-full border-2 border-white px-5 text-lg font-bold">
            {t.close}
          </button>
        </div>

        {!who ? (
          <>
            <h1 className="condensed m-0 text-[52px] leading-[0.95] font-black uppercase sm:text-[80px]">{t.whoCalling}</h1>
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
              <b>{t.ask(who)}</b>
              <br />
              {t.realReads(who)}
            </p>
            <div className="rounded-md bg-white p-6 text-ink sm:p-8">
              <MemberCode circle={circle} member={who} size="xl" readAloud />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setVerdict("match")} className="min-h-20 rounded-md bg-trust text-2xl font-black text-white uppercase">
                {t.match}
              </button>
              <button type="button" onClick={() => setVerdict("nomatch")} className="min-h-20 rounded-md bg-alert-ink text-2xl font-black text-white uppercase">
                {t.noMatch}
              </button>
            </div>
            <button type="button" onClick={() => setWho(null)} className="self-start text-lg font-bold underline underline-offset-4">
              {t.someoneElse}
            </button>
          </>
        ) : verdict === "match" ? (
          <div className="flex flex-col gap-5">
            <h1 className="condensed m-0 text-[56px] leading-[0.95] font-black uppercase sm:text-[84px]">{t.reallyThem(who)}</h1>
            <p className="m-0 text-[22px] leading-normal text-[#D6E2FF]">{t.matchBody}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <h1 className="condensed m-0 text-[56px] leading-[0.95] font-black uppercase sm:text-[84px]">{t.hangUp}</h1>
            <p className="m-0 text-[22px] leading-normal text-[#FFD9CF]">{t.noMatchBody(who)}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function FamilyCircles() {
  const { circles, addCircle, removeCircle, addMember, rekeyCircle, lock } = useFamily();
  const [freshDrop, setFreshDrop] = useState<Record<string, string>>({});
  // A QR code carries the secret: hide it the moment the phone locks.
  const wordsOpen = useWordsOpen(lock);
  const [newName, setNewName] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [me, setMe] = useState("");
  const [others, setOthers] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [invite, setInvite] = useState<{ circle: Pick<Circle, "name">; qr: string; link: string } | null>(null);
  const [checking, setChecking] = useState<Circle | null>(null);
  // Opened from the home-screen shortcut (/family?check=1): go straight to the check.
  const wantsCheck = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get("check") === "1", () => false);
  const [shortcutDismissed, setShortcutDismissed] = useState(false);
  const active = checking ?? (wantsCheck && !shortcutDismissed && circles.length > 0 ? circles[0] : null);
  const [copied, setCopied] = useState(false);

  const showInvite = async (c: Pick<Circle, "secret" | "name" | "members" | "lang" | "replaces">) => {
    const link = circleJoinLink(window.location.origin, c);
    setCopied(false);
    setInvite({ circle: c, link, qr: await QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: "M" }) });
  };

  // New secret: everyone's old words stop working, so a removed member or a lost phone can't be used.
  const startFresh = async (c: Circle) => {
    if (!(await ensureOpen(lock))) return;
    const drop = freshDrop[c.id] || null;
    const who = drop ? `${drop} will be removed and ` : "";
    if (!window.confirm(`${who}everyone's words will change. Each family member must scan the new QR code. Continue?`)) return;
    const secret = newSecret();
    const replaces = await secretTag(c.secret);
    rekeyCircle(c.id, secret, replaces, drop);
    const members = drop ? c.members.filter((m) => normalizeName(m) !== normalizeName(drop)) : c.members;
    await showInvite({ ...c, secret, replaces, members });
  };

  const create = async () => {
    const meClean = cleanName(me);
    const members = cleanMembers([meClean, ...others.split(",")]).slice(0, MAX_MEMBERS);
    if (!name.trim() || !meClean || members.length < 2) return;
    const c = { name: name.trim().slice(0, 80), secret: newSecret(), members, me: meClean, lang };
    addCircle(c);
    await showInvite(c);
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="circles-h">
      {active && (
        <WhoIsCalling
          circle={active}
          onClose={() => {
            setChecking(null);
            setShortcutDismissed(true);
            if (wantsCheck) history.replaceState(null, "", "/family");
          }}
        />
      )}
      <div className="flex flex-col gap-2">
        <h2 id="circles-h" className="condensed m-0 text-[34px] font-black uppercase">Family Circle</h2>
        <p className="m-0 max-w-[760px] text-body">One QR code for the whole family. Everyone scans it once, picks their name, and gets their own three words. Anyone in the circle can then check anyone else.</p>
      </div>

      {circles.map((c) => (
        <article key={c.id} className="flex flex-col gap-5 rounded-md border-2 border-ink bg-card p-6 shadow-block">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="condensed m-0 text-[30px] font-black uppercase">{c.name}</h3>
              <p className="m-0 text-sm text-muted">You are {c.me} · {c.members.length} members · words in {LANGS[c.lang].label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={async () => {
                  if (await ensureOpen(lock)) await showInvite(c);
                }} className="min-h-11 rounded border-[1.5px] border-ink px-3 text-sm font-bold">
                Add someone
              </button>
              <button type="button" onClick={async () => {
                  if ((await ensureOpen(lock)) && window.confirm(`Leave ${c.name}? Your words for this circle will be deleted from this phone.`)) removeCircle(c.id);
                }} className="min-h-11 rounded px-3 text-sm font-semibold text-muted hover:text-alert-ink">
                Leave
              </button>
            </div>
          </div>
          <button type="button" onClick={() => setChecking(c)} className="flex min-h-20 items-center justify-center rounded-md bg-ink text-[28px] font-black text-white uppercase" style={{ fontStretch: "75%" }}>
            Who&apos;s calling? Check now →
          </button>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addMember(c.id, newName[c.id] ?? "");
              setNewName((n) => ({ ...n, [c.id]: "" }));
            }}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-bold">
              Someone joined who isn&apos;t listed here? Add their name
              <input
                value={newName[c.id] ?? ""}
                maxLength={MAX_NAME}
                onChange={(e) => setNewName((n) => ({ ...n, [c.id]: e.target.value }))}
                className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal"
              />
            </label>
            <button type="submit" disabled={!cleanName(newName[c.id] ?? "")} className="min-h-11 rounded border-[1.5px] border-ink px-4 font-bold disabled:opacity-50">
              Add
            </button>
          </form>
          <div className="flex flex-col gap-1 rounded bg-paper p-4">
            <p className="eyebrow m-0">Your words, only when you call family</p>
            <MemberCode circle={c} member={c.me} />
            <p className="m-0 text-sm text-muted">Never read words to someone who called you. Family only ever asks for them.</p>
          </div>
          <details className="rounded border-[1.5px] border-line p-4">
            <summary className="cursor-pointer font-bold">New phone, lost phone, or someone left?</summary>
            <div className="mt-3 flex flex-col gap-3 text-body">
              <p className="m-0">
                <b>New phone:</b> tap <b>Add someone</b> and let them scan the QR code again.
              </p>
              <p className="m-0">
                <b>Lost phone, or someone should no longer be in the circle:</b> start fresh. Everyone gets new words, the old ones stop working, and each person scans the new code.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-bold">
                  Remove someone (optional)
                  <select
                    value={freshDrop[c.id] ?? ""}
                    onChange={(e) => setFreshDrop((d) => ({ ...d, [c.id]: e.target.value }))}
                    className="min-h-11 rounded border-[1.5px] border-faint bg-card px-3 text-base font-normal"
                  >
                    <option value="">Nobody, just new words</option>
                    {c.members
                      .filter((m) => normalizeName(m) !== normalizeName(c.me))
                      .map((m) => (
                        <option key={normalizeName(m)} value={m}>
                          {m}
                        </option>
                      ))}
                  </select>
                </label>
                <button type="button" onClick={() => void startFresh(c)} className="min-h-11 rounded border-2 border-alert-ink px-4 font-bold text-alert-ink">
                  Start fresh with new words
                </button>
              </div>
            </div>
          </details>
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
            <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="The Krishna family" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Your name (what family calls you)
            <input value={me} maxLength={MAX_NAME} onChange={(e) => setMe(e.target.value)} placeholder="Grandma" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Everyone else, separated by commas
            <input value={others} onChange={(e) => setOthers(e.target.value)} placeholder="Ethan, Priya, Dad" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Words in
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="min-h-11 rounded border-[1.5px] border-faint bg-card px-3 text-base font-normal">
              {(Object.keys(LANGS) as Lang[]).map((l) => (
                <option key={l} value={l}>
                  {LANGS[l].label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={!name.trim() || !me.trim() || !others.trim()} className="min-h-12 self-start rounded bg-ink px-5 font-extrabold tracking-[0.06em] text-white uppercase disabled:opacity-50">
            Create circle
          </button>
        </form>

        {invite && wordsOpen && (
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

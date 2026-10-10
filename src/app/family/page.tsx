"use client";

import QRCode from "qrcode";
import { useState } from "react";
import { DrillButton } from "@/components/DrillButton";
import { FamilyCircles } from "@/components/FamilyCircles";
import { LockSetting } from "@/components/LockSetting";
import { RollingCode } from "@/components/RollingCode";
import { newSecret, pairingLink } from "@/lib/family/protocol";
import { ensureOpen, useWordsOpen } from "@/lib/family/lock";
import { useFamily, type TrustedContact } from "@/lib/family/store";

function ContactForm({ contact, onSave }: { contact: TrustedContact | null; onSave: (c: TrustedContact | null) => void }) {
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-md border-[1.5px] border-line bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name.trim() && phone.trim() ? { name: name.trim(), phone: phone.trim() } : null);
        setSaved(true);
      }}
    >
      <h2 className="condensed m-0 text-2xl font-black uppercase">Trusted contact</h2>
      <p className="m-0 text-[15px] text-body">Scammers say &ldquo;don&apos;t tell anyone.&rdquo; During a suspicious call, Countersign offers a one-tap text to this person.</p>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Name
        <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} placeholder="Priya (daughter)" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Mobile number
        <input value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} inputMode="tel" placeholder="+1 555 010 0199" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className="min-h-12 rounded bg-ink px-5 font-extrabold tracking-[0.06em] text-white uppercase">
          Save contact
        </button>
        {saved && <span className="text-sm font-semibold text-trust-ink" role="status">Saved on this device</span>}
      </div>
    </form>
  );
}

export default function FamilyPage() {
  const { pairings, contact, add, remove, setContact, lock } = useFamily();
  const wordsOpen = useWordsOpen(lock);
  const [me, setMe] = useState("");
  const [them, setThem] = useState("");
  const [invite, setInvite] = useState<{ link: string; qr: string; them: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvite = async () => {
    if (!me.trim() || !them.trim()) return;
    const secret = newSecret();
    const link = pairingLink(window.location.origin, me.trim(), them.trim(), secret);
    add({ me: me.trim(), them: them.trim(), role: "a", secret });
    setCopied(false);
    setInvite({ link, qr: await QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: "M" }), them: them.trim() });
  };

  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 pt-6 pb-20 sm:px-8">
      <header className="flex max-w-[760px] flex-col gap-4">
        <p className="eyebrow m-0 text-[13px]">Family Countersign · works offline · nothing leaves your phone</p>
        <h1 className="condensed m-0 text-[48px] leading-[0.95] font-black uppercase sm:text-[68px]">AI can fake a voice. It can&apos;t fake our secret.</h1>
        <p className="m-0 text-lg leading-relaxed text-body">
          Pair once, in person. From then on, both phones show the same three words, changing every minute. If someone calls sounding like family and asks for money, ask for the countersign.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <a href="/family/practice" className="flex min-h-12 items-center rounded border-2 border-ink px-4 font-bold text-ink no-underline">Practice a scam call →</a>
        <a href="/family/card" className="flex min-h-12 items-center rounded border-2 border-ink px-4 font-bold text-ink no-underline">Print a card for the phone table →</a>
        <DrillButton className="min-h-12 rounded border-2 border-ink px-4 font-bold text-ink" />
      </div>

      <FamilyCircles />
      <LockSetting />

      <div className="flex flex-col gap-2 border-t border-line pt-8">
        <h2 className="condensed m-0 text-[30px] font-black uppercase">Two-person pairing (strongest)</h2>
        <p className="m-0 max-w-[760px] text-body">For the people you talk to most. Each direction gets its own words, so even someone who tricks one of you can&apos;t relay them to the other.</p>
      </div>

      {pairings.length > 0 && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Paired family">
          {pairings.map((p) => (
            <article key={p.id} className="flex flex-col gap-5 rounded-md border-2 border-ink bg-card p-6 shadow-block">
              <div className="flex items-start justify-between gap-3">
                <h2 className="condensed m-0 text-[30px] font-black uppercase">{p.them}</h2>
                <button type="button" onClick={async () => {
                  if (await ensureOpen(lock)) remove(p.id);
                }} className="min-h-11 rounded px-3 text-sm font-semibold text-muted hover:text-alert-ink">
                  Unpair
                </button>
              </div>
              <div className="flex flex-col gap-1 rounded bg-trust-wash p-4 text-trust-ink">
                <p className="eyebrow m-0 text-trust-ink">If someone says they&apos;re {p.them}, they must say</p>
                <RollingCode pairing={p} which="theirs" />
              </div>
              <div className="flex flex-col gap-1 rounded bg-paper p-4">
                <p className="eyebrow m-0">Say this only when you called {p.them}</p>
                <RollingCode pairing={p} which="mine" />
                <p className="m-0 text-sm text-muted">Never read it to someone who called you. Real family won&apos;t ask for it that way.</p>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="flex flex-wrap items-start gap-8">
        <form
          className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-md border-[1.5px] border-line bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void createInvite();
          }}
        >
          <h2 className="condensed m-0 text-2xl font-black uppercase">Pair two phones</h2>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Your name (what they call you)
            <input value={me} onChange={(e) => setMe(e.target.value)} placeholder="Grandma" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Their name
            <input value={them} onChange={(e) => setThem(e.target.value)} placeholder="Ethan" className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
          </label>
          <button type="submit" disabled={!me.trim() || !them.trim()} className="min-h-12 self-start rounded bg-ink px-5 font-extrabold tracking-[0.06em] text-white uppercase disabled:opacity-50">
            Show pairing code
          </button>
        </form>

        {invite && wordsOpen && (
          <div className="animate-pop flex min-w-0 flex-[1_1_380px] flex-col items-start gap-3 rounded-md border-2 border-ink bg-card p-6 shadow-block">
            <p className="eyebrow m-0">Have {invite.them} scan this with their phone camera</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={invite.qr} alt={`Pairing QR code for ${invite.them}`} width={320} height={320} className="rounded border border-line" />
            <p className="m-0 text-sm text-muted">Pair in person. Anyone who sees this code could pair too. Close it when you&apos;re done.</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(invite.link).then(() => setCopied(true))}
              className="min-h-11 rounded px-3 text-sm font-semibold text-trust hover:bg-trust-wash"
            >
              {copied ? "Link copied" : "Copy link instead (only send it over a channel you trust)"}
            </button>
            <button type="button" onClick={() => setInvite(null)} className="min-h-11 rounded border-[1.5px] border-ink px-4 font-bold">
              Done
            </button>
          </div>
        )}

        <ContactForm key={contact?.phone ?? "none"} contact={contact} onSave={setContact} />
      </section>
    </main>
  );
}

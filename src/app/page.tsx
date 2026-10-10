const INBOX = process.env.NEXT_PUBLIC_INBOX_ADDRESS;

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 border-ink font-mono text-sm font-semibold">{n}</span>
      <div className="flex flex-col gap-1">
        <span className="text-lg font-bold">{title}</span>
        <span className="leading-relaxed text-body">{body}</span>
      </div>
    </li>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-16 px-4 pt-6 pb-24 sm:px-8">
      <section className="flex flex-wrap items-center gap-10">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <p className="eyebrow m-0 text-[13px]">For families · works offline · free</p>
          <h1 className="condensed m-0 text-[56px] leading-[0.9] font-black uppercase sm:text-[88px]">
            AI can fake a voice.
            <br />
            It can&apos;t fake
            <br />
            our secret.
          </h1>
          <p className="m-0 max-w-[620px] text-xl leading-normal text-body">
            Scammers clone a grandchild&apos;s voice from a few seconds of video and call asking for bail money. Countersign gives your family a secret that changes every minute. A clone can sound exactly right and still not know it.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/family" className="flex min-h-14 items-center rounded bg-ink px-6 text-lg font-extrabold tracking-[0.04em] text-white uppercase no-underline">
              Protect my family →
            </a>
            <a href="/family/practice" className="flex min-h-14 items-center rounded border-2 border-ink px-6 text-lg font-bold text-ink no-underline">
              Try a practice call
            </a>
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3 rounded-md border-2 border-ink bg-card p-7 shadow-block" aria-label="Example: what Grandma sees">
          <p className="eyebrow m-0">&ldquo;Grandma, it&apos;s me, Ethan&hellip;&rdquo;</p>
          <p className="m-0 text-lg">Ask: <b>&ldquo;What&apos;s our countersign?&rdquo;</b> The real Ethan should say:</p>
          <p className="condensed m-0 text-[54px] leading-[0.92] font-black text-trust-ink uppercase">
            Copper
            <br />
            Lantern
            <br />
            River
          </p>
          <p className="m-0 font-mono text-xs text-muted">Example. Your family&apos;s words are different and change every minute.</p>
        </div>
      </section>

      <section aria-labelledby="how-h" className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 id="how-h" className="condensed m-0 text-[40px] leading-none font-black uppercase">How it works</h2>
          <p className="m-0 leading-relaxed text-body">
            The same idea as a bank&apos;s security code app, but spoken out loud, and built for a grandparent. No account, no server, and nothing leaves your family&apos;s phones.
          </p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-6 p-0">
          <Step n="01" title="Scan one QR code, together" body="Everyone in the family scans it once, in person, and picks their name. That's the whole setup." />
          <Step n="02" title="Everyone gets their own three words" body="They change every minute, on every phone, even with no signal." />
          <Step n="03" title="A call asks for money? Check who it really is" body="Tap “Who’s calling?”, tap their name, and ask for the words. Wrong words, or a dodge, means hang up." />
        </ol>
      </section>

      <section aria-labelledby="check-h" className="flex flex-wrap items-stretch gap-6">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-md bg-night p-8 text-white">
          <h2 id="check-h" className="condensed m-0 text-[36px] leading-none font-black uppercase">Got a suspicious message?</h2>
          <p className="m-0 text-lg leading-relaxed text-[#D5DAE1]">
            Paste it, share it from your messages app, or drop a screenshot. An AI investigator runs real lookups (domain age, email authentication, lookalike domains, where the links go) and shows you the evidence, not just a guess.
          </p>
          <a href="/check" className="flex min-h-12 items-center self-start rounded bg-white px-5 font-extrabold text-ink uppercase no-underline">
            Check a message →
          </a>
        </div>
        {INBOX && (
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 rounded-md border-[1.5px] border-line bg-card p-8">
            <p className="eyebrow m-0">Got it by email?</p>
            <h2 className="condensed m-0 text-[30px] leading-none font-black uppercase">Just forward it</h2>
            <p className="m-0 leading-relaxed text-body">
              Send it to <b className="font-mono break-all text-ink">{INBOX}</b>. The full case file comes back by email in under a minute.
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3" aria-label="Why you can trust it">
        {[
          ["Works with no signal", "Installs like an app. The family words are computed on the phone, so they work in a basement or on a plane.", "/family"],
          ["Open protocol", "The method is published with test vectors, so anyone can check it or build a compatible app.", "https://github.com/MaanavKrishna/countersign/blob/main/docs/PROTOCOL.md"],
          ["Measured honestly", "We publish how the message checker compares with a plain AI prompt, including the runs where we lost.", "/evidence"],
        ].map(([h, b, href]) => (
          <a key={h} href={href} className="flex flex-col gap-2 rounded-md border-[1.5px] border-line bg-card p-6 text-ink no-underline hover:border-ink">
            <span className="condensed text-2xl font-black uppercase">{h}</span>
            <span className="leading-relaxed text-body">{b}</span>
          </a>
        ))}
      </section>
    </main>
  );
}

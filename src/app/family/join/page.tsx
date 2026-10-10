"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { MAX_NAME, cleanName, normalizeName, parseJoinFragment, secretTag } from "@/lib/countersign/circle";
import { joinStatus, useFamily } from "@/lib/countersign/store";

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

type Parsed = NonNullable<ReturnType<typeof parseJoinFragment>>;

export default function JoinCirclePage() {
  // null during server render and hydration: the #fragment is only visible in the browser.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const { circles, addCircle } = useFamily();
  const [captured, setCaptured] = useState<Parsed | "invalid" | null>(null);
  const [joined, setJoined] = useState<{ circle: string; as: string } | null>(null);
  const [other, setOther] = useState("");
  // A "start fresh" link names the old circle it replaces (by tag, never by secret).
  const [replaceId, setReplaceId] = useState<string | null>(null);

  // Read the link once, then remove the secret from the address bar and history straight away.
  if (captured === null && hash !== null) setCaptured(parseJoinFragment(hash) ?? "invalid");
  useEffect(() => {
    if (captured !== null && window.location.hash) history.replaceState(null, "", "/family/join");
  }, [captured]);
  useEffect(() => {
    const tag = captured && captured !== "invalid" ? captured.replaces : null;
    if (!tag) return;
    let alive = true;
    void Promise.all(circles.map(async (c) => ((await secretTag(c.secret)) === tag ? c.id : null))).then(
      (ids) => alive && setReplaceId(ids.find(Boolean) ?? null),
    );
    return () => {
      alive = false;
    };
  }, [captured, circles]);

  if (joined) {
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pt-10 pb-20 sm:px-8">
        <p className="eyebrow m-0">Family Circle</p>
        <h1 className="condensed m-0 text-[44px] leading-[0.95] font-black uppercase">
          You joined {joined.circle} as {joined.as}.
        </h1>
        <p className="m-0 text-lg">Your words are on the Family page. Use them only when you are the one calling family.</p>
        <Link href="/family" className="font-bold text-trust">Open Family Countersign →</Link>
      </main>
    );
  }
  if (captured === null) return <main className="mx-auto max-w-[640px] px-4 pt-10 sm:px-8" aria-busy="true" />;
  if (captured === "invalid") {
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-10 sm:px-8">
        <h1 className="condensed m-0 text-[44px] font-black uppercase">This family link isn&apos;t valid.</h1>
        <Link href="/family" className="font-bold text-trust">Go to Family Countersign →</Link>
      </main>
    );
  }
  const parsed = captured;

  const join = (raw: string) => {
    const me = cleanName(raw);
    if (!me) return;
    const members = parsed.members.some((m) => normalizeName(m) === normalizeName(me)) ? parsed.members : [...parsed.members, me];
    addCircle({ name: parsed.name, secret: parsed.secret, members, me, lang: parsed.lang, replaces: parsed.replaces ?? undefined }, replaceId);
    setJoined({ circle: parsed.name, as: me });
  };

  if (joinStatus(circles, parsed.secret) === "member") {
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-10 sm:px-8">
        <h1 className="condensed m-0 text-[44px] font-black uppercase">You&apos;re already in {parsed.name}.</h1>
        <Link href="/family" className="font-bold text-trust">Open Family Countersign →</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pt-10 pb-20 sm:px-8">
      <p className="eyebrow m-0">Join {parsed.name}</p>
      <div role="alert" className="rounded-md border-2 border-alert-ink bg-alert-soft p-4 text-ink">
        <p className="m-0 text-lg font-bold">Only join if a family member is showing you this code in person.</p>
        <p className="m-0 mt-1">Did someone send you this link in a message or ask you to tap it on a call? Stop. That&apos;s how a scammer would set up fake &ldquo;family words&rdquo;.</p>
      </div>
      {replaceId && (
        <p className="m-0 rounded-md bg-trust-wash p-4 text-lg">
          {parsed.name} has started fresh with new words. Joining replaces your old {parsed.name} words on this phone.
        </p>
      )}
      <h1 className="condensed m-0 text-[44px] leading-[0.95] font-black uppercase">Which one are you?</h1>
      <div className="flex flex-col gap-3">
        {parsed.members.map((m) => (
          <button key={normalizeName(m)} type="button" onClick={() => join(m)} className="min-h-16 rounded-md border-2 border-ink bg-card px-5 text-left text-2xl font-black uppercase" style={{ fontStretch: "75%" }}>
            {m}
          </button>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          join(other);
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-bold">
          Not listed? Your name
          <input value={other} maxLength={MAX_NAME} onChange={(e) => setOther(e.target.value)} className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
        </label>
        <button type="submit" disabled={!cleanName(other)} className="min-h-11 rounded bg-ink px-4 font-bold text-white disabled:opacity-50">
          Join
        </button>
      </form>
      <p className="m-0 text-sm text-muted">If you add your own name, ask whoever showed you the code to add it on their phone too (Family page → Add their name).</p>
    </main>
  );
}

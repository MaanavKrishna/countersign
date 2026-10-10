"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { parseJoinFragment } from "@/lib/countersign/circle";
import { joinStatus, useFamily } from "@/lib/countersign/store";

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export default function JoinCirclePage() {
  // null during server render and hydration: the #fragment is only visible in the browser.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const { circles, addCircle } = useFamily();
  const [joined, setJoined] = useState<{ circle: string; as: string } | null>(null);
  const [other, setOther] = useState("");

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
  if (hash === null) return <main className="mx-auto max-w-[640px] px-4 pt-10 sm:px-8" aria-busy="true" />;

  const parsed = parseJoinFragment(hash);
  if (!parsed) {
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-10 sm:px-8">
        <h1 className="condensed m-0 text-[44px] font-black uppercase">This family link isn&apos;t valid.</h1>
        <Link href="/family" className="font-bold text-trust">Go to Family Countersign →</Link>
      </main>
    );
  }

  const join = (me: string) => {
    const members = parsed.members.some((m) => m.toLowerCase() === me.toLowerCase()) ? parsed.members : [...parsed.members, me];
    addCircle({ name: parsed.name, secret: parsed.secret, members, me, lang: parsed.lang });
    setJoined({ circle: parsed.name, as: me });
    history.replaceState(null, "", "/family/join"); // drop the secret from the address bar
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
      <h1 className="condensed m-0 text-[44px] leading-[0.95] font-black uppercase">Which one are you?</h1>
      <div className="flex flex-col gap-3">
        {parsed.members.map((m) => (
          <button key={m} type="button" onClick={() => join(m)} className="min-h-16 rounded-md border-2 border-ink bg-card px-5 text-left text-2xl font-black uppercase" style={{ fontStretch: "75%" }}>
            {m}
          </button>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (other.trim()) join(other.trim());
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-bold">
          Not listed? Your name
          <input value={other} onChange={(e) => setOther(e.target.value)} className="min-h-11 rounded border-[1.5px] border-faint px-3 text-base font-normal" />
        </label>
        <button type="submit" disabled={!other.trim()} className="min-h-11 rounded bg-ink px-4 font-bold text-white disabled:opacity-50">
          Join
        </button>
      </form>
    </main>
  );
}

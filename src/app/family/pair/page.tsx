"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { parsePairingFragment } from "@/lib/countersign/protocol";
import { canAccept, useFamily } from "@/lib/countersign/store";

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export default function PairPage() {
  // null during server render and hydration: the #fragment is only visible in the browser.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const { pairings, add } = useFamily();
  const [paired, setPaired] = useState<{ a: string; b: string } | null>(null);

  if (paired) {
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pt-10 pb-20 sm:px-8">
        <p className="eyebrow m-0">Family Countersign</p>
        <h1 className="condensed m-0 text-[44px] leading-[0.95] font-black uppercase">Paired with {paired.a}.</h1>
        <p className="m-0 text-lg">You&apos;ll both see the same words on the Family page, changing every minute.</p>
        <Link href="/family" className="font-bold text-trust">Open Family Countersign →</Link>
      </main>
    );
  }
  if (hash === null) {
    return <main className="mx-auto max-w-[640px] px-4 pt-10 sm:px-8" aria-busy="true" />;
  }
  const parsed = parsePairingFragment(hash);
  if (!parsed) {
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-10 sm:px-8">
        <h1 className="condensed m-0 text-[44px] font-black uppercase">This pairing link isn&apos;t valid.</h1>
        <Link href="/family" className="font-bold text-trust">Go to Family Countersign →</Link>
      </main>
    );
  }
  const status = canAccept(pairings, parsed);
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pt-10 pb-20 sm:px-8">
      <p className="eyebrow m-0">Family Countersign</p>
      <h1 className="condensed m-0 text-[44px] leading-[0.95] font-black uppercase">
        Pair with {parsed.a} as {parsed.b}?
      </h1>
      {status === "self" && <p className="m-0 text-lg text-alert-ink">This is your own pairing code. Have {parsed.b} scan it on their phone.</p>}
      {status === "duplicate" && <p className="m-0 text-lg">You&apos;re already paired with {parsed.a}.</p>}
      {status === "ok" && (
        <button
          type="button"
          onClick={() => {
            add({ me: parsed.b, them: parsed.a, role: "b", secret: parsed.secret });
            setPaired({ a: parsed.a, b: parsed.b });
            history.replaceState(null, "", "/family/pair"); // drop the secret from the address bar
          }}
          className="min-h-14 self-start rounded bg-ink px-6 text-lg font-extrabold tracking-[0.04em] text-white uppercase"
        >
          Pair with {parsed.a}
        </button>
      )}
      <Link href="/family" className="font-bold text-trust">Open Family Countersign →</Link>
    </main>
  );
}

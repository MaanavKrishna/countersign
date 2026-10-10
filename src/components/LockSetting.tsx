"use client";

import { useEffect, useState } from "react";
import { createLock, lockSupported, relock } from "@/lib/countersign/lock";
import { useFamily } from "@/lib/countersign/store";

/** Optional: require Face ID, fingerprint or the phone's PIN before family words are shown. */
export function LockSetting() {
  const { lock, setLock, circles, pairings } = useFamily();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void lockSupported().then(setSupported);
  }, []);
  if (circles.length === 0 && pairings.length === 0) return null;

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border-[1.5px] border-line bg-card p-6" aria-labelledby="lock-h">
      <h2 id="lock-h" className="condensed m-0 text-2xl font-black uppercase">Lock the words</h2>
      <p className="m-0 text-[15px] text-body">
        Ask for this phone&apos;s Face ID, fingerprint or PIN before showing any family words, so someone who picks up the phone can&apos;t read them. Stays unlocked for five minutes.
      </p>
      {lock ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-trust-ink" role="status">Words are locked on this phone.</span>
          <button type="button" onClick={relock} className="min-h-11 rounded border-[1.5px] border-ink px-4 font-bold">
            Lock now
          </button>
          <button type="button" onClick={() => setLock(null)} className="min-h-11 rounded px-3 text-sm font-semibold text-muted hover:text-alert-ink">
            Turn off
          </button>
        </div>
      ) : supported === false ? (
        <p className="m-0 text-sm text-muted">This phone or browser can&apos;t do this. Set a screen lock on the phone itself instead.</p>
      ) : (
        <button
          type="button"
          disabled={!supported}
          onClick={async () => {
            setError(null);
            try {
              setLock(await createLock());
            } catch {
              setError("Lock wasn't set up. You can try again.");
            }
          }}
          className="min-h-12 self-start rounded bg-ink px-5 font-extrabold tracking-[0.04em] text-white uppercase disabled:opacity-50"
        >
          Lock with Face ID or fingerprint
        </button>
      )}
      {error && <p className="m-0 text-sm text-alert-ink">{error}</p>}
    </section>
  );
}

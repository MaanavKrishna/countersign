"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/telemetry/reportError";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-12 pb-20 sm:px-8">
      <p className="eyebrow m-0">Something went wrong</p>
      <h1 className="condensed m-0 text-[44px] leading-[0.95] font-black uppercase">This page hit a problem.</h1>
      <p className="m-0 text-lg text-body">
        Your family words are safe: they&apos;re stored on this phone, not on our servers. If a call is happening right now, the rule still works without the app: ask for the countersign, and if they can&apos;t say it, hang up and call back on the number you know.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={retry} className="min-h-12 rounded bg-ink px-5 font-extrabold text-white uppercase">
          Try again
        </button>
        <a href="/family" className="flex min-h-12 items-center rounded border-2 border-ink px-5 font-bold text-ink no-underline">
          Go to Family
        </a>
      </div>
    </main>
  );
}

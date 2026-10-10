"use client";

import { useState, type ReactNode } from "react";
import { unlock, useWordsOpen } from "@/lib/family/lock";
import { useFamily } from "@/lib/family/store";

/** Shows family words only when the optional screen-lock gate is open. */
export function WordsGate({ children, label = "Unlock to see the words" }: { children: ReactNode; label?: string }) {
  const { lock } = useFamily();
  const open = useWordsOpen(lock);
  const [failed, setFailed] = useState(false);
  if (open || !lock) return <>{children}</>;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={async () => setFailed(!(await unlock(lock)))}
        className="flex min-h-14 items-center gap-2 self-start rounded border-2 border-current px-5 text-lg font-bold"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {label}
      </button>
      {failed && <p className="m-0 text-sm">Couldn&apos;t unlock. Try again, or use the phone&apos;s PIN.</p>}
    </div>
  );
}

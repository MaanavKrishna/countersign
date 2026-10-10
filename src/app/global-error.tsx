"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

// Replaces the root layout when it fails, so it carries its own document and inline styles.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#E9EBEE", color: "#111418" }}>
        <title>Countersign: something went wrong</title>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px" }}>
          <h1 style={{ fontSize: 36, margin: "0 0 16px" }}>Something went wrong.</h1>
          <p style={{ fontSize: 18, lineHeight: 1.5 }}>
            Your family words are stored on this phone and are safe. On a suspicious call: ask for the countersign, and if they can&apos;t say it, hang up and call back on the number you know.
          </p>
          <button type="button" onClick={retry} style={{ minHeight: 48, padding: "0 20px", fontSize: 16, fontWeight: 800, background: "#111418", color: "#fff", border: 0, borderRadius: 4 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

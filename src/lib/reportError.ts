/** Send a crash report from an error page: error type, digest and path only. Messages can echo
 *  user content (a pasted scam, a parse error), so they never leave the device. */
export function reportError(error: Error & { digest?: string }) {
  try {
    const body = JSON.stringify({ name: error.name, digest: error.digest, path: window.location.pathname });
    if (!navigator.sendBeacon?.("/api/report", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/report", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* reporting must never throw */
  }
}

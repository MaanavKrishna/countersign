/** Send a crash report from an error page. Path only: no query, no fragment. */
export function reportError(error: Error & { digest?: string }) {
  try {
    const body = JSON.stringify({ message: error.message, digest: error.digest, path: window.location.pathname });
    if (!navigator.sendBeacon?.("/api/report", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/report", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* reporting must never throw */
  }
}

"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds; removes it elsewhere
 *  so a worker left over from a local production run can't serve stale dev assets. */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* offline support is best-effort */
    });
  }, []);
  return null;
}

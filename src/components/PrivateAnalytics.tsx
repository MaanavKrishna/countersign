"use client";

import { Analytics } from "@vercel/analytics/next";
import { scrubUrl } from "@/lib/telemetry/privacy";

/** Cookieless page counts. URLs are reduced to their path, so no secret or shared message is ever sent. */
export function PrivateAnalytics() {
  return <Analytics beforeSend={(e) => ({ ...e, url: scrubUrl(e.url) })} />;
}

import type { Instrumentation } from "next";
import { scrubPath } from "@/lib/privacy";

// Server errors as one structured log line each (visible in the Vercel logs): error type, digest
// and route only. No query strings, and no message, which can echo the text being investigated.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  console.error(
    JSON.stringify({
      level: "error",
      source: "server",
      name: err instanceof Error ? err.name : typeof err,
      digest: typeof err === "object" && err && "digest" in err ? String(err.digest) : undefined,
      method: request.method,
      path: scrubPath(request.path),
      route: context.routePath,
      kind: context.routeType,
    }),
  );
};

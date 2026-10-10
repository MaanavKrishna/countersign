import type { Instrumentation } from "next";
import { scrubPath } from "@/lib/privacy";

// Server errors as one structured log line each (visible in the Vercel logs), without query strings.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  console.error(
    JSON.stringify({
      level: "error",
      source: "server",
      message: (err instanceof Error ? err.message : String(err)).slice(0, 300),
      digest: typeof err === "object" && err && "digest" in err ? String(err.digest) : undefined,
      method: request.method,
      path: scrubPath(request.path),
      route: context.routePath,
      kind: context.routeType,
    }),
  );
};

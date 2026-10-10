import { scrubPath } from "@/lib/telemetry/privacy";
import { clientIp, createLimiter } from "@/lib/server/ratelimit";

// Client-side crash reports from the error pages: error type, digest and path only.
const limiter = createLimiter({ limit: 20, windowMs: 10 * 60_000 });

export async function POST(req: Request) {
  if (!limiter.check(clientIp(req.headers)).ok) return new Response(null, { status: 204 });
  try {
    const body = (await req.json()) as { name?: unknown; digest?: unknown; path?: unknown };
    console.error(
      JSON.stringify({
        level: "error",
        source: "client",
        name: typeof body.name === "string" ? body.name.slice(0, 40) : undefined,
        digest: typeof body.digest === "string" ? body.digest.slice(0, 64) : undefined,
        path: typeof body.path === "string" ? scrubPath(body.path).slice(0, 200) : undefined,
      }),
    );
  } catch {
    /* ignore malformed reports */
  }
  return new Response(null, { status: 204 });
}

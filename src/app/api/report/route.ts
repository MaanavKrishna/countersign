import { scrubPath } from "@/lib/privacy";
import { clientIp, createLimiter } from "@/lib/ratelimit";

// Client-side crash reports from the error pages: path, digest and a short message only.
const limiter = createLimiter({ limit: 20, windowMs: 10 * 60_000 });

export async function POST(req: Request) {
  if (!limiter.check(clientIp(req.headers)).ok) return new Response(null, { status: 204 });
  try {
    const body = (await req.json()) as { message?: unknown; digest?: unknown; path?: unknown };
    console.error(
      JSON.stringify({
        level: "error",
        source: "client",
        message: typeof body.message === "string" ? body.message.slice(0, 300) : undefined,
        digest: typeof body.digest === "string" ? body.digest.slice(0, 64) : undefined,
        path: typeof body.path === "string" ? scrubPath(body.path).slice(0, 200) : undefined,
      }),
    );
  } catch {
    /* ignore malformed reports */
  }
  return new Response(null, { status: 204 });
}

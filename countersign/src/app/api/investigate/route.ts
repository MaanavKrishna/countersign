import { runInvestigation, type InvestigationInput } from "@/lib/pipeline";
import { clientIp, investigateLimiter } from "@/lib/ratelimit";
import type { InvestigationEvent } from "@/lib/types";

export const maxDuration = 120;

const MAX_TEXT = 20_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const gate = investigateLimiter.check(clientIp(req.headers));
  if (!gate.ok) {
    return Response.json(
      { error: `Too many investigations from your network. Try again in ${gate.retryAfterSec}s.` },
      { status: 429, headers: { "retry-after": String(gate.retryAfterSec) } },
    );
  }
  let body: { text?: unknown; image?: { mediaType?: unknown; base64?: unknown } | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
  let image: InvestigationInput["image"] = null;
  if (body.image && typeof body.image.base64 === "string" && typeof body.image.mediaType === "string") {
    if (!IMAGE_TYPES.has(body.image.mediaType)) return Response.json({ error: "Unsupported image type" }, { status: 400 });
    if ((body.image.base64.length * 3) / 4 > MAX_IMAGE_BYTES) return Response.json({ error: "Image too large (max 4MB)" }, { status: 413 });
    image = { mediaType: body.image.mediaType as NonNullable<InvestigationInput["image"]>["mediaType"], base64: body.image.base64 };
  }
  if (!text.trim() && !image) return Response.json({ error: "Paste a message or add a screenshot." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: InvestigationEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        await runInvestigation({ text, image }, emit);
      } catch (err) {
        emit({ type: "error", message: (err as Error).message, recoverable: false });
        emit({ type: "done", elapsedMs: 0 });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

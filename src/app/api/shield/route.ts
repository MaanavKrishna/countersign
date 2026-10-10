import { assessCall } from "@/lib/agent/shield";
import { assessLocally } from "@/lib/shieldLocal";
import { clientIp, shieldLimiter } from "@/lib/ratelimit";

export const maxDuration = 30;

export async function POST(req: Request) {
  const gate = shieldLimiter.check(clientIp(req.headers));
  if (!gate.ok) return Response.json({ error: "Slow down" }, { status: 429, headers: { "retry-after": String(gate.retryAfterSec) } });
  let transcript = "";
  try {
    const body = (await req.json()) as { transcript?: unknown };
    transcript = typeof body.transcript === "string" ? body.transcript.slice(-6000) : "";
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (transcript.trim().length < 8) return Response.json({ error: "Transcript too short" }, { status: 400 });
  try {
    return Response.json(await assessCall(transcript));
  } catch (err) {
    // AI unavailable (outage, quota): degrade to the on-device rules rather than going silent mid-call.
    console.error("shield: AI assessment failed, using rules", (err as Error).message);
    return Response.json({ ...assessLocally(transcript), source: "rules" });
  }
}

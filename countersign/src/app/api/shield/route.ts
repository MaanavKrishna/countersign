import { assessCall } from "@/lib/agent/shield";

export const maxDuration = 30;

export async function POST(req: Request) {
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
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

import { Mailroom, verifyWebhook } from "agentboxd";
import { after } from "next/server";
import { toInvestigationInput } from "@/lib/channels/agentboxd";
import { firstDelivery } from "@/lib/channels/dedupe";
import { heldNotice, shouldInvestigate } from "@/lib/channels/inboxPolicy";
import { collectCase } from "@/lib/investigator/report/collect";
import { renderReportEmail } from "@/lib/investigator/report/emailText";

export const maxDuration = 120;

type Envelope = { type: string; data: { inbox_id: string | null; message_id: string | null } };

// Forward-to-check: Agentboxd delivers mail sent to our inbox here. We ack fast
// and investigate after the response, then reply with the case file.
export async function POST(req: Request) {
  const secret = process.env.AGENTBOXD_WEBHOOK_SECRET;
  if (!secret || !process.env.AGENTBOXD_API_KEY) return new Response("inbox disabled", { status: 404 });

  const raw = await req.text();
  const sig = req.headers.get("x-mailroom-signature") ?? "";
  const ts = req.headers.get("x-mailroom-timestamp") ?? "";
  if (!verifyWebhook(sig, ts, raw, secret)) return new Response("bad signature", { status: 401 });
  if (!firstDelivery(req.headers.get("x-mailroom-delivery") ?? "")) return new Response("duplicate", { status: 200 });

  let event: Envelope;
  try {
    event = JSON.parse(raw) as Envelope;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const { inbox_id: inboxId, message_id: messageId } = event.data ?? {};
  if (event.type !== "message.received" || !inboxId || !messageId) return new Response("ignored", { status: 200 });

  after(async () => {
    try {
      const mr = new Mailroom();
      const msg = await mr.messages.get(messageId);
      if (msg.direction !== "inbound") return;
      // Dedupe on the signed message id, skip auto-replies, spoofable senders and floods.
      const policy = shouldInvestigate(msg);
      console.log(`[inbox] ${messageId} policy=${policy.reason}`);
      if (!policy.ok) return;
      const held = heldNotice(msg as Parameters<typeof heldNotice>[0]);
      if (held) {
        await mr.messages.reply(inboxId, messageId, { text: `${held.subject}\n\n${held.text}`, labels: ["countersign:forgery"] });
        console.log(`[inbox] ${messageId} replied held-notice`);
        return;
      }
      const result = await collectCase(toInvestigationInput(msg));
      const live = process.env.NEXT_PUBLIC_SITE_URL ?? "https://countersign-maanavkrishnas-projects.vercel.app";
      const { subject, text } = renderReportEmail(result, live);
      await mr.messages.reply(inboxId, messageId, { text: `${subject}\n\n${text}`, labels: [`countersign:${result.report.band}`] });
      console.log(`[inbox] ${messageId} replied band=${result.report.band}`);
    } catch (err) {
      console.error(`[inbox] ${messageId} failed:`, err);
    }
  });
  return new Response("accepted", { status: 202 });
}

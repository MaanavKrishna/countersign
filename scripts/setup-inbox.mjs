// One-time setup (needs AGENTBOXD_API_KEY in .env.local):
//   node --env-file=.env.local scripts/setup-inbox.mjs https://<live-url>
// Creates the inbox and a signed webhook, and appends the webhook secret and
// inbox address to .env.local without printing the secret.
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { Mailroom } from "agentboxd";

const base = process.argv[2];
if (!base) throw new Error("usage: setup-inbox.mjs <https://live-url>");
const mr = new Mailroom();
const inbox = await mr.inboxes.create({ client_id: "countersign-check" });
const secret = randomBytes(32).toString("hex");
const hook = await mr.webhooks.create({ url: `${base}/api/inbox`, events: ["message.received"], inbox_ids: [inbox.id], payload: "envelope", secret });
appendFileSync(".env.local", `\nAGENTBOXD_WEBHOOK_SECRET=${secret}\nNEXT_PUBLIC_INBOX_ADDRESS=${inbox.address}\n`, { mode: 0o600 });
console.log("Inbox:", inbox.address, "| webhook:", hook.id);
console.log("Added AGENTBOXD_WEBHOOK_SECRET and NEXT_PUBLIC_INBOX_ADDRESS to .env.local — copy both to Vercel.");

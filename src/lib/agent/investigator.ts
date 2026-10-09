import type Anthropic from "@anthropic-ai/sdk";
import { registrableDomain } from "../domain";
import { runTool, toolDefinitions, type ToolContext, type ToolRun } from "../tools";
import type { Finding, Indicators, InvestigationEvent } from "../types";
import { MODEL, UNTRUSTED_RULE, anthropic, textOf, untrusted } from "./client";

const MAX_TURNS = 8;

type Emit = (e: InvestigationEvent) => void;

export type InvestigationResult = {
  findings: Finding[];
  prosecution: string;
  checked: { lookalike: Set<string>; rdap: Set<string>; trace: Set<string>; emailAuth: boolean };
  log: string[];
};

function systemPrompt(today: string): string {
  return `You are Countersign's fraud investigator. A user received a message and wants to know whether it is genuine or a scam. Today's date is ${today}.
${UNTRUSTED_RULE}

Investigate with your tools — they perform real lookups. Work like a forensic analyst:
- Check every domain that appears (sender, links, reply-to) with lookalike_check, and rdap_lookup the ones that aren't plainly a major brand's own domain.
- If email headers are present, call email_auth once and dns_check the sender domain with as_sender=true.
- trace_url every distinct link (max 4). If a link redirects to a new host, check that host too.
- Call independent tools in parallel in a single turn.
- Before each batch of tool calls, write exactly one short sentence (under 15 words) saying what you're checking and why, in plain language a grandparent would follow.
- Don't call the same tool twice with the same argument. Stop when the evidence is in — usually 2–4 turns.

When done, write your closing argument as the prosecutor: 2–3 sentences making the strongest case that this is fraud, citing only evidence your tools returned. If the evidence points to a genuine message, say plainly that the prosecution has a weak case and why. Start it with "CLOSING:".`;
}

function briefing(ind: Indicators): string {
  const lines = [
    `Sender domain: ${ind.senderDomain ?? "none"}${ind.displayName ? ` (display name "${ind.displayName}")` : ""}`,
    `Reply-To domain: ${ind.replyToDomain ?? "none"}`,
    `Links: ${ind.urls.slice(0, 8).join(", ") || "none"}`,
    `All domains: ${ind.domains.slice(0, 12).join(", ") || "none"}`,
    `Phone numbers: ${ind.phones.join(", ") || "none"}`,
    `Payment methods mentioned: ${ind.paymentMethods.join(", ") || "none"}`,
    `Brands named: ${ind.claimedBrands.join(", ") || "none"}`,
    `Email headers present: ${ind.headers ? "yes" : "no"}`,
  ];
  return `Automatically extracted indicators (verify them, don't assume):\n${lines.join("\n")}`;
}

export async function investigate(
  text: string,
  image: Anthropic.ImageBlockParam | null,
  ind: Indicators,
  emit: Emit,
  onTool: (name: string, run: ToolRun, args: Record<string, unknown>) => void,
): Promise<InvestigationResult> {
  const ctx: ToolContext = { indicators: ind };
  const tools = toolDefinitions();
  const findings: Finding[] = [];
  const log: string[] = [];
  const checked = { lookalike: new Set<string>(), rdap: new Set<string>(), trace: new Set<string>(), emailAuth: false };
  const seen = new Set<string>();
  let prosecution = "";

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (image) userContent.push(image);
  userContent.push({
    type: "text",
    text: `${briefing(ind)}\n\nThe message:\n${untrusted(text || "(screenshot attached — read it carefully, including any links or numbers in it)")}`,
  });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];
  const today = new Date().toISOString().slice(0, 10);

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: systemPrompt(today),
      tools,
      output_config: { effort: "medium" },
      messages,
    });

    if (response.stop_reason === "refusal") throw new Error("The model declined to analyze this message.");

    const said = textOf(response.content);
    const closingIdx = said.indexOf("CLOSING:");
    const narration = (closingIdx >= 0 ? said.slice(0, closingIdx) : said).trim();
    if (narration) emit({ type: "thought", text: narration.split("\n")[0].replace(/\*\*|`/g, "").slice(0, 200) });
    if (closingIdx >= 0) prosecution = said.slice(closingIdx + "CLOSING:".length).trim();

    messages.push({ role: "assistant", content: response.content });
    const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || uses.length === 0) {
      if (!prosecution && said) prosecution = said;
      break;
    }

    const results = await Promise.all(
      uses.map(async (use) => {
        const args = (use.input ?? {}) as Record<string, unknown>;
        const key = `${use.name}:${JSON.stringify(args)}`;
        emit({ type: "tool_start", id: use.id, name: use.name, args });
        if (seen.has(key)) {
          return { use, run: null as ToolRun | null, content: "Already checked — see the earlier result." };
        }
        seen.add(key);
        try {
          const run = await runTool(use.name, args, ctx);
          return { use, run, content: JSON.stringify({ summary: run.summary, findings: run.findings.map((f) => `${f.label}: ${f.detail}`), finalHost: run.finalHost ?? undefined }) };
        } catch (err) {
          return { use, run: null, content: `Tool error: ${(err as Error).message}`, error: true };
        }
      }),
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const r of results) {
      const args = (r.use.input ?? {}) as Record<string, unknown>;
      if (r.run) {
        findings.push(...r.run.findings);
        onTool(r.use.name, r.run, args);
        log.push(`${r.use.name}(${JSON.stringify(args)}) → ${r.run.summary}`);
        if (r.use.name === "lookalike_check") checked.lookalike.add(registrableDomain(String(args.domain)));
        if (r.use.name === "rdap_lookup") checked.rdap.add(registrableDomain(String(args.domain)));
        if (r.use.name === "trace_url") checked.trace.add(String(args.url));
        if (r.use.name === "email_auth") checked.emailAuth = true;
      }
      emit({
        type: "tool_result",
        id: r.use.id,
        name: r.use.name,
        summary: r.run?.summary ?? r.content,
        findings: r.run?.findings ?? [],
      });
      toolResults.push({ type: "tool_result", tool_use_id: r.use.id, content: r.content, is_error: "error" in r ? true : undefined });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return { findings, prosecution, checked, log };
}

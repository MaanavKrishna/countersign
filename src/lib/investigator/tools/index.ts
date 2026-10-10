import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Indicators, ToolOutput } from "@/lib/investigator/types";
import { dnsCheck } from "@/lib/investigator/tools/dns";
import { emailAuth } from "@/lib/investigator/tools/emailAuth";
import { lookalikeCheck } from "@/lib/investigator/tools/lookalike";
import { rdapLookup } from "@/lib/investigator/tools/rdap";
import { sandboxEnabled, sandboxScan } from "@/lib/investigator/tools/sandbox";
import { traceUrl } from "@/lib/investigator/tools/traceUrl";

export type ToolContext = { indicators: Indicators };
export type ToolRun = ToolOutput & { screenshot?: string | null; finalHost?: string | null };

const domainArg: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: { domain: { type: "string", description: "A hostname or domain, e.g. paypa1-secure.com" } },
  required: ["domain"],
  additionalProperties: false,
};

const urlArg: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: { url: { type: "string", description: "The link exactly as it appears in the message" } },
  required: ["url"],
  additionalProperties: false,
};

export function toolDefinitions(): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = [
    {
      name: "rdap_lookup",
      description:
        "Look up a domain's registration date and registrar in the public RDAP registry. Use on every sender domain and every link domain that isn't an obvious major brand. Newly registered domains are a strong fraud signal.",
      input_schema: domainArg,
      strict: true,
    },
    {
      name: "lookalike_check",
      description:
        "Check whether a domain imitates a commonly impersonated brand: character swaps (paypa1), homoglyphs from other alphabets, brand names in subdomains (paypal.com.evil.ru) or inside unrelated domains (paypal-secure.com). Use on every domain in the message.",
      input_schema: domainArg,
      strict: true,
    },
    {
      name: "dns_check",
      description:
        "Check a domain's MX, SPF and DMARC records. Set as_sender=true for the domain the email claims to come from.",
      input_schema: {
        type: "object",
        properties: {
          domain: { type: "string" },
          as_sender: { type: "boolean", description: "True if this domain sent the email" },
        },
        required: ["domain", "as_sender"],
        additionalProperties: false,
      },
      strict: true,
    },
    {
      name: "email_auth",
      description:
        "Read the email's own headers: SPF/DKIM/DMARC results recorded by the receiving server, whether Reply-To or Return-Path differ from the sender, and whether the sender's domain matches the brand it claims to be. Takes no arguments; only useful when headers were provided.",
      input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
    {
      name: "trace_url",
      description:
        "Inspect a link without opening the page: structural tricks (shorteners, raw IPs, @ tricks, risky TLDs, deep subdomains) and the HTTP redirect chain (headers only). Returns the final host — run lookalike_check / rdap_lookup on it if it differs.",
      input_schema: urlArg,
      strict: true,
    },
  ];
  if (sandboxEnabled()) {
    tools.push({
      name: "sandbox_scan",
      description:
        "Render a link in a remote, isolated browser (urlscan.io) and get a screenshot plus a malicious/brand-phishing verdict. Slow (~20s). Use once, on the single most important link.",
      input_schema: urlArg,
      strict: true,
    });
  }
  return tools;
}

export async function runTool(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<ToolRun> {
  const s = (k: string) => String(input[k] ?? "").trim();
  switch (name) {
    case "rdap_lookup":
      return rdapLookup(s("domain"));
    case "lookalike_check":
      return lookalikeCheck(s("domain"));
    case "dns_check":
      return dnsCheck(s("domain"), input.as_sender === true);
    case "email_auth":
      return emailAuth(ctx.indicators);
    case "trace_url":
      return traceUrl(s("url"));
    case "sandbox_scan":
      return sandboxScan(s("url"));
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

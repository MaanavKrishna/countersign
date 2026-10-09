import { brandsMentioned } from "./brands";
import { hostFromUrl, normalizeHost, registrableDomain } from "./domain";
import type { Indicators } from "./types";

// TLDs we accept for bare (scheme-less) domains, to avoid matching "file.txt"
// or "e.g". Includes the cheap TLDs scammers favour.
const BARE_TLDS = new Set([
  "com", "net", "org", "info", "biz", "io", "co", "me", "us", "uk", "ca", "au", "in", "de", "fr", "nl", "ru", "cn",
  "app", "dev", "xyz", "top", "site", "online", "live", "shop", "store", "club", "icu", "vip", "click", "link",
  "help", "support", "services", "cfd", "sbs", "buzz", "rest", "fun", "monster", "lol", "gq", "tk", "ml", "cf", "ga",
  "ly", "gl", "to", "cc", "ws", "pw", "su", "gov", "edu", "mobi", "tel", "page", "cloud", "today", "world", "life",
]);

const PAYMENT_TERMS: [RegExp, string][] = [
  [/\b(apple|itunes|google play|steam|amazon|target|walmart|ebay|razer gold)?\s*gift ?cards?\b/i, "gift card"],
  [/\bbitcoin atm\b/i, "bitcoin ATM"],
  [/\b(bitcoin|btc|ethereum|eth|usdt|tether|crypto(currency)?)\b/i, "cryptocurrency"],
  [/\bwire transfer|\bwire the\b|\bbank wire\b/i, "wire transfer"],
  [/\bwestern union\b/i, "Western Union"],
  [/\bmoneygram\b/i, "MoneyGram"],
  [/\bzelle\b/i, "Zelle"],
  [/\bvenmo\b/i, "Venmo"],
  [/\bcash ?app\b/i, "Cash App"],
  [/\bprepaid (debit )?card\b/i, "prepaid card"],
];

const HEADER_KEY = /^([A-Za-z][A-Za-z0-9-]{1,40}):\s?(.*)$/;
const KNOWN_HEADERS = new Set([
  "from", "to", "cc", "subject", "date", "reply-to", "return-path", "authentication-results",
  "received", "message-id", "dkim-signature", "received-spf", "arc-authentication-results",
  "mime-version", "content-type", "x-mailer", "sender", "delivered-to",
]);

/** Parse a leading RFC 5322-style header block (supports folded lines). */
export function parseHeaders(text: string): { headers: Record<string, string> | null; body: string } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headers: Record<string, string> = {};
  let i = 0;
  let lastKey: string | null = null;
  let known = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") break;
    if (/^\s/.test(line) && lastKey) {
      headers[lastKey] += " " + line.trim();
      continue;
    }
    const m = HEADER_KEY.exec(line);
    if (!m) break;
    const key = m[1].toLowerCase();
    if (KNOWN_HEADERS.has(key)) known++;
    // Keep the first Authentication-Results/From etc; append repeats.
    headers[key] = headers[key] ? `${headers[key]} | ${m[2]}` : m[2];
    lastKey = key;
  }
  if (known < 2) return { headers: null, body: text };
  return { headers, body: lines.slice(i).join("\n").trim() };
}

/** "PayPal Service <service@paypa1.com>" → { name, address } */
export function parseAddress(value: string | undefined): { name: string | null; address: string | null } {
  if (!value) return { name: null, address: null };
  const angle = /^\s*"?([^"<]*?)"?\s*<([^>]+)>/.exec(value);
  if (angle) return { name: angle[1].trim() || null, address: angle[2].trim().toLowerCase() };
  const bare = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i.exec(value);
  return { name: null, address: bare ? bare[1].toLowerCase() : null };
}

function domainOfAddress(address: string | null): string | null {
  if (!address || !address.includes("@")) return null;
  return normalizeHost(address.split("@").pop()!);
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function extractIndicators(input: string): Indicators {
  const text = input.slice(0, 20000);
  const { headers, body } = parseHeaders(text);

  const emails = uniq(
    (text.match(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi) ?? []).map((e) => e.toLowerCase()),
  );

  const schemeUrls = text.match(/\bhttps?:\/\/[^\s<>"'`)\]]+/gi) ?? [];
  // Bare domains, optionally with a path: "bit.ly/3xK9pQ", "usps-track.top"
  const bareCandidates =
    text.match(/(?<![@\w.\/-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<>"'`)\]]*)?/gi) ?? [];
  const bare = bareCandidates.filter((c) => {
    const host = c.split("/")[0].toLowerCase();
    const t = host.split(".").pop()!;
    return BARE_TLDS.has(t) && !schemeUrls.some((u) => u.toLowerCase().includes(host));
  });
  const urls = uniq([...schemeUrls, ...bare].map((u) => u.replace(/[.,;:!?]+$/, "")));

  const senderAddr = parseAddress(headers?.["from"]);
  const replyAddr = parseAddress(headers?.["reply-to"]);
  const returnAddr = parseAddress(headers?.["return-path"]);

  const urlHosts = urls.map(hostFromUrl).filter((h): h is string => !!h);
  const emailHosts = emails.map((e) => domainOfAddress(e)).filter((h): h is string => !!h);
  const domains = uniq([...urlHosts, ...emailHosts].map(registrableDomain));

  const phones = uniq(
    (text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [])
      .map((p) => p.trim())
      .filter((p) => {
        const digits = p.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15 && !/^\d{4}-\d{2}-\d{2}/.test(p);
      }),
  );

  const money = uniq(
    text.match(/(?:[$£€₹]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m))?)|(?:\b\d[\d,]*(?:\.\d+)?\s?(?:dollars|usd|btc|eth|usdt)\b)/gi) ?? [],
  );

  const paymentMethods = uniq(PAYMENT_TERMS.filter(([re]) => re.test(text)).map(([, label]) => label));

  const brandText = [senderAddr.name ?? "", headers?.["subject"] ?? "", body].join("\n");
  const claimedBrands = brandsMentioned(brandText).map((b) => b.name);

  return {
    urls,
    domains,
    emails,
    phones,
    money,
    paymentMethods,
    headers,
    senderDomain: domainOfAddress(senderAddr.address),
    replyToDomain: domainOfAddress(replyAddr.address),
    returnPathDomain: domainOfAddress(returnAddr.address),
    displayName: senderAddr.name,
    claimedBrands,
  };
}

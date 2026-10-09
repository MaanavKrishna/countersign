// Second-level public suffixes common enough to matter for registrable-domain
// extraction. Not a full Public Suffix List — good enough for scam triage.
const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk",
  "com.au", "net.au", "org.au", "gov.au",
  "co.in", "gov.in", "net.in", "org.in",
  "co.nz", "co.za", "co.jp", "com.br", "com.mx", "com.sg", "com.hk", "com.tr", "com.cn",
]);

export function normalizeHost(host: string): string {
  let h = host.trim().toLowerCase().replace(/\.$/, "");
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

/** example.co.uk from a.b.example.co.uk */
export function registrableDomain(host: string): string {
  const h = normalizeHost(host);
  if (isIpAddress(h)) return h;
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const lastTwo = parts.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return parts.slice(-3).join(".");
  return lastTwo;
}

export function tld(host: string): string {
  const parts = normalizeHost(host).split(".");
  return parts[parts.length - 1] ?? "";
}

export function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[?[0-9a-f:]+\]?$/i.test(host) && host.includes(":");
}

export function hostFromUrl(raw: string): string | null {
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`);
    return normalizeHost(u.hostname);
  } catch {
    return null;
  }
}

/** https://evil.com/x → hxxps://evil[.]com/x — safe to display, never clickable. */
export function defang(text: string): string {
  return text
    .replace(/\bhttp(s?):\/\//gi, (_m, s: string) => `hxxp${s}://`)
    .replace(/([a-z0-9-])\.([a-z0-9-])/gi, "$1[.]$2");
}

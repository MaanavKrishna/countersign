// When a user forwards a suspicious email, the scam's own headers survive only
// as text in the body. Rebuild them so the header-based checks still work.

const MARKERS = [
  /-{5,}\s*Forwarded message\s*-{5,}/i, // Gmail
  /Begin forwarded message:/i, // Apple Mail
  /^_{10,}\s*$/m, // Outlook
  /-{5,}\s*Original Message\s*-{5,}/i,
];

const KEEP = ["from", "reply-to", "subject"];

export function extractForwarded(text: string): { isForward: boolean; original: string } {
  const normalized = text.replace(/\r\n/g, "\n");
  let start = -1;
  for (const m of MARKERS) {
    const hit = m.exec(normalized);
    if (hit && (start === -1 || hit.index < start)) start = hit.index + hit[0].length;
  }
  if (start === -1) return { isForward: false, original: text };

  const lines = normalized.slice(start).replace(/^\s*\n/, "").split("\n");
  const headers: string[] = [];
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i].replace(/^>\s?/, "").trim();
    if (line === "") break;
    const m = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (!m) break;
    if (KEEP.includes(m[1].toLowerCase())) headers.push(`${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}: ${m[2]}`);
  }
  const body = lines.slice(i).map((l) => l.replace(/^>\s?/, "")).join("\n").trim();
  const ordered = KEEP.map((k) => headers.find((h) => h.toLowerCase().startsWith(`${k}:`))).filter(Boolean);
  return { isForward: true, original: `${ordered.join("\n")}\n\n${body}` };
}

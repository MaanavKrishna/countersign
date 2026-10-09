/** Turns Web Share Target params into one message for the investigator. */
export function composeSharedText(p: { title?: string | null; text?: string | null; url?: string | null }): string {
  const text = (p.text ?? "").trim();
  const title = (p.title ?? "").trim();
  const url = (p.url ?? "").trim();
  const parts: string[] = [];
  if (title && title !== text && !text.startsWith(title)) parts.push(title);
  if (text) parts.push(text);
  if (url && !text.includes(url)) parts.push(url);
  return parts.join("\n").slice(0, 20000);
}

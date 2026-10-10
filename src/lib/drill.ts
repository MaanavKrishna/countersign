// A weekly two-minute family drill, as a calendar file any phone can import.
// It carries no names or secrets: only a reminder and a link to the practice call.

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escape a TEXT value and fold it at 75 octets (RFC 5545 §3.1, §3.3.11). */
function line(name: string, value: string): string {
  const text = `${name}:${value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")}`;
  const out: string[] = [];
  let cur = "";
  for (const ch of text) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (new TextEncoder().encode(cur + ch).length > limit) {
      out.push(cur);
      cur = "";
    }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function drillCalendar(origin: string, start: Date): string {
  const practice = `${origin}/family/practice`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Countersign//Family drill//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:drill-${start.getTime()}@countersign`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    "DURATION:PT5M",
    "RRULE:FREQ=WEEKLY",
    line("SUMMARY", "Countersign family drill (2 minutes)"),
    line(
      "DESCRIPTION",
      `Call one family member and ask: "What's our countersign?" They read their three words from the Family page. Then try a practice scam call: ${practice}`,
    ),
    line("URL", practice),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0M",
    line("DESCRIPTION", "Countersign family drill"),
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Next Sunday at 18:00 local time. */
export function nextDrillTime(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(18, 0, 0, 0);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || (now >= d ? 7 : 0)));
  return d;
}

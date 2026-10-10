import { describe, expect, it } from "vitest";
import { drillCalendar, nextDrillTime } from "../drill";

describe("weekly drill calendar", () => {
  const ics = drillCalendar("https://example.app", new Date("2026-10-11T17:00:00Z"));
  const lines = ics.split("\r\n");

  it("is a valid single-event iCalendar file with CRLF line endings", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/\n/);
  });

  it("repeats weekly from the chosen time, with a reminder", () => {
    expect(lines).toContain("DTSTART:20261011T170000Z");
    expect(lines).toContain("RRULE:FREQ=WEEKLY");
    expect(lines).toContain("BEGIN:VALARM");
  });

  it("links to the practice call and keeps every line within 75 octets", () => {
    expect(ics).toContain("https://example.app/family/practice");
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it("contains no family secrets or names", () => {
    expect(ics).not.toMatch(/secret|#v=/i);
  });
});

describe("nextDrillTime", () => {
  it("picks the coming Sunday at 18:00, or today if it's Sunday before 18:00", () => {
    const wed = nextDrillTime(new Date(2026, 9, 7, 10)); // Wed 7 Oct
    expect([wed.getDay(), wed.getDate(), wed.getHours()]).toEqual([0, 11, 18]);
    expect(nextDrillTime(new Date(2026, 9, 11, 9)).getDate()).toBe(11);
    expect(nextDrillTime(new Date(2026, 9, 11, 19)).getDate()).toBe(18);
  });
});

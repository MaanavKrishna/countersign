import { describe, expect, it } from "vitest";
import { LANGS, isLang, type Lang } from "@/lib/family/languages";
import { UI, type UiText } from "@/lib/family/ui";

const flat = (t: UiText): string[] => [
  ...Object.values(t).flatMap((v) => (typeof v === "string" ? [v] : typeof v === "function" ? [(v as (x: unknown) => string)("Ana")] : [])),
  ...Object.values(t.card).flat(),
];

describe("grandparent screens in every circle language", () => {
  it("has every string, non-empty, for every word-list language", () => {
    for (const l of Object.keys(LANGS) as Lang[]) {
      expect(UI[l]).toBeDefined();
      for (const s of flat(UI[l])) expect(s.trim().length).toBeGreaterThan(0);
    }
  });
  it("puts the caller's name into the sentences that need it", () => {
    for (const l of Object.keys(LANGS) as Lang[]) {
      expect(UI[l].ask("Ana")).toContain("Ana");
      expect(UI[l].noMatchBody("Ana")).toContain("Ana");
      expect(UI[l].reallyThem("Ana")).toContain("Ana");
    }
  });
  it("rejects prototype keys as languages", () => {
    expect(isLang("constructor")).toBe(false);
    expect(isLang("__proto__")).toBe(false);
    expect(isLang("es")).toBe(true);
  });
});

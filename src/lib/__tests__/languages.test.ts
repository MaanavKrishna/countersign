import { describe, expect, it } from "vitest";
import { circleJoinLink, memberCode, parseJoinFragment, type Circle } from "../countersign/circle";
import { LANGS, loadWords } from "../countersign/languages";

const SECRET = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

describe("word lists in the family's language", () => {
  it("ships five 2048-word lists", async () => {
    expect(Object.keys(LANGS).sort()).toEqual(["en", "es", "fr", "it", "pt"]);
    for (const l of Object.keys(LANGS) as (keyof typeof LANGS)[]) expect(await loadWords(l)).toHaveLength(2048);
  });
  it("derives the same indexes, shown in the circle's language", async () => {
    const en = await memberCode(SECRET, "Abuela", 42, "en");
    const es = await memberCode(SECRET, "Abuela", 42, "es");
    const esWords = await loadWords("es");
    expect(es).not.toEqual(en);
    for (const w of es) expect(esWords).toContain(w);
  });
  it("carries the language in the join link, defaulting unknown values to English", () => {
    const c: Circle = { id: "1", name: "Familia", secret: SECRET, members: ["Abuela", "Mateo"], me: "Abuela", lang: "es", createdAt: 0 };
    expect(parseJoinFragment(new URL(circleJoinLink("https://x.example", c)).hash)?.lang).toBe("es");
    expect(parseJoinFragment(`#v=2&s=${SECRET}&c=F&m=A,B&l=xx`)?.lang).toBe("en");
  });
});

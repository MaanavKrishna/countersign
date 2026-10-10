import { describe, expect, it } from "vitest";
import { matchesPerson } from "@/lib/shield/people";

describe("matchesPerson", () => {
  it("matches a plain name inside the claimed identity", () => {
    expect(matchesPerson("Ethan", "It's me, Ethan, your grandson")).toBe(true);
    expect(matchesPerson("Ethan", "Chase fraud department")).toBe(false);
  });

  it("keeps accented names whole, whether composed or decomposed", () => {
    expect(matchesPerson("Lucía", "Abuela, soy Lucía")).toBe(true);
    expect(matchesPerson("Lucía", "Abuela, soy Lucía")).toBe(true);
    expect(matchesPerson("Lucía", "It's Luc")).toBe(false);
  });

  it("matches non-Latin names", () => {
    expect(matchesPerson("Мария", "Это Мария")).toBe(true);
  });
});

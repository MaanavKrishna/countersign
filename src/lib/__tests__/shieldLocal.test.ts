import { describe, expect, it } from "vitest";
import { assessLocally } from "../shieldLocal";

const jail = [
  "Grandma? It's me. It's Ethan.",
  "I'm okay, but I'm in trouble. There was an accident and the police took me in.",
  "I'm in jail right now. Please don't tell Mom, she'll freak out.",
  "The lawyer says bail is two thousand dollars and it has to be today.",
  "Can you go to the store and get Apple gift cards and read me the numbers on the back?",
].join("\n");

const bank = [
  "Hello, this is the Chase fraud prevention team.",
  "We've stopped a suspicious purchase on your card.",
  "I've just sent a six-digit code to your phone. Please read it back to me.",
].join("\n");

const techSupport = "This is Microsoft support. Your computer has a virus. Please download AnyDesk so I can fix it remotely.";

const genuine = [
  "Hey Grandma, it's Ethan!",
  "I just wanted to tell you I got the internship I applied for.",
  "I'll come by on Sunday for lunch if that's okay with you.",
].join("\n");

describe("on-device Call Shield", () => {
  it("escalates the grandparent script to danger, names the claimed caller, and asks for a challenge", () => {
    const a = assessLocally(jail);
    expect(a.stage).toBe("danger");
    expect(a.claimedIdentity).toBe("Ethan");
    expect(a.challengeNow).toBe(true);
    const labels = a.tactics.map((t) => t.label);
    expect(labels).toEqual(expect.arrayContaining(["Secrecy", "Untraceable payment"]));
    expect(a.source).toBe("device");
  });

  it("every quote is verbatim from the transcript", () => {
    for (const t of [jail, bank, techSupport]) {
      for (const q of assessLocally(t).tactics) expect(t.toLowerCase()).toContain(q.quote.toLowerCase());
    }
  });

  it("flags a bank asking for a one-time code", () => {
    const a = assessLocally(bank);
    expect(a.stage).not.toBe("calm");
    expect(a.claimedIdentity).toMatch(/Chase/);
    expect(a.tactics.map((t) => t.label)).toContain("Credential request");
    expect(a.challengeNow).toBe(true);
  });

  it("flags remote-access requests", () => {
    expect(assessLocally(techSupport).tactics.map((t) => t.label)).toContain("Remote access");
    expect(assessLocally(techSupport).stage).not.toBe("calm");
  });

  it("stays calm on a genuine family call", () => {
    const a = assessLocally(genuine);
    expect(a.stage).toBe("calm");
    expect(a.challengeNow).toBe(false);
  });
});

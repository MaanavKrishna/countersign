// Practice call: a rehearsal so asking for the countersign becomes a habit
// before a real scammer calls. Pure state machine; the page adds voice.

export type Choice = "send" | "ask" | "hangup" | "match";
export type Outcome = "pass" | "fail" | "soft";

type Scenario = {
  title: string;
  caller: string; // who the voice claims to be ({name} is replaced)
  lines: string[];
  /** What the caller says when asked for the countersign. "WORDS" = the real words. */
  dodge: string;
  genuine: boolean;
};

export const SCENARIOS = {
  jail: {
    title: "Grandson in jail",
    caller: "{name}",
    genuine: false,
    lines: [
      "Grandma? It's me, {name}. I'm okay, but I'm in trouble.",
      "There was an accident and the police took me in. I'm in jail.",
      "Please don't tell Mom, she'll freak out.",
      "The lawyer says bail is two thousand dollars, and it has to be today. Can you get Apple gift cards and read me the numbers?",
    ],
    dodge: "What? Grandma, there's no time for games! Please, I'm scared, just get the cards!",
  },
  bank: {
    title: "Bank fraud team",
    caller: "Chase fraud department",
    genuine: false,
    lines: [
      "Hello, this is the Chase fraud prevention team. We've stopped a suspicious nine hundred dollar purchase on your card.",
      "To reverse it, I need to verify you. I've just sent a six-digit code to your phone. Please read it back to me.",
    ],
    dodge: "Ma'am, I'm with the bank. I don't know any family words. I just need that code before the charge goes through.",
  },
  borrowed: {
    title: "“My phone died”",
    caller: "{name}",
    genuine: false,
    lines: [
      "Grandma, it's {name}! I'm calling from a friend's phone. Mine got smashed.",
      "I'm stuck at the bus station and my wallet was stolen. Can you send five hundred dollars to my friend's account so I can get home tonight?",
    ],
    dodge: "I can't check the words, my phone is broken! That's why I'm on my friend's phone. Please, Grandma, I just need to get home.",
  },
  genuine: {
    title: "A genuine call",
    caller: "{name}",
    genuine: true,
    lines: ["Hi! It's {name}. My car broke down and I'm stuck at the garage. Could you lend me a hundred dollars until Friday?"],
    dodge: "WORDS",
  },
} satisfies Record<string, Scenario>;

export type ScenarioId = keyof typeof SCENARIOS;

export type PracticeState = {
  scenario: ScenarioId;
  phase: "ringing" | "talking" | "decide" | "reply" | "done";
  line: number;
  reply: string | null;
  outcome: Outcome | null;
};

export type Action =
  | { type: "answer" }
  | { type: "next" }
  | { type: "choose"; choice: Choice }
  | { type: "restart" }
  | { type: "select"; scenario: ScenarioId };

export const start = (scenario: ScenarioId): PracticeState => ({ scenario, phase: "ringing", line: 0, reply: null, outcome: null });

export function practiceStep(s: PracticeState, a: Action): PracticeState {
  const sc = SCENARIOS[s.scenario];
  if (a.type === "restart") return start(s.scenario);
  if (a.type === "select") return start(a.scenario);
  if (a.type === "answer" && s.phase === "ringing") return { ...s, phase: "talking", line: 0 };
  if (a.type === "next" && s.phase === "talking") {
    return s.line + 1 < sc.lines.length ? { ...s, line: s.line + 1 } : { ...s, phase: "decide" };
  }
  if (a.type === "choose" && (s.phase === "decide" || s.phase === "reply")) {
    const done = (outcome: Outcome): PracticeState => ({ ...s, phase: "done", outcome });
    switch (a.choice) {
      case "send":
        return done(sc.genuine ? "soft" : "fail");
      case "ask":
        return s.phase === "decide" ? { ...s, phase: "reply", reply: sc.dodge } : s;
      case "hangup":
        return done(sc.genuine ? "soft" : "pass");
      case "match":
        return done(sc.genuine && s.phase === "reply" ? "pass" : "fail");
    }
  }
  return s;
}

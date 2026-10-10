import { describe, expect, it } from "vitest";
import { SCENARIOS, practiceStep, start, type PracticeState } from "../practice";

const run = (scenario: keyof typeof SCENARIOS, actions: Parameters<typeof practiceStep>[1][]): PracticeState =>
  actions.reduce(practiceStep, start(scenario));

describe("practice call", () => {
  it("starts ringing, then plays the caller's lines after answering", () => {
    const s = practiceStep(start("jail"), { type: "answer" });
    expect(s.phase).toBe("talking");
    expect(s.line).toBe(0);
  });
  it("moves to the decision once every line has played", () => {
    const n = SCENARIOS.jail.lines.length;
    const s = run("jail", [{ type: "answer" }, ...Array.from({ length: n }, () => ({ type: "next" as const }))]);
    expect(s.phase).toBe("decide");
  });
  it("fails if you send money, passes if you ask and then hang up on a dodge", () => {
    const n = SCENARIOS.jail.lines.length;
    const toDecide = [{ type: "answer" as const }, ...Array.from({ length: n }, () => ({ type: "next" as const }))];
    expect(run("jail", [...toDecide, { type: "choose", choice: "send" }]).outcome).toBe("fail");
    const asked = run("jail", [...toDecide, { type: "choose", choice: "ask" }]);
    expect(asked.phase).toBe("reply");
    expect(asked.reply).toBe(SCENARIOS.jail.dodge);
    expect(practiceStep(asked, { type: "choose", choice: "hangup" }).outcome).toBe("pass");
    expect(practiceStep(asked, { type: "choose", choice: "send" }).outcome).toBe("fail");
  });
  it("on a genuine call, the caller says the words and accepting them passes", () => {
    const n = SCENARIOS.genuine.lines.length;
    const asked = run("genuine", [{ type: "answer" }, ...Array.from({ length: n }, () => ({ type: "next" as const })), { type: "choose", choice: "ask" }]);
    expect(asked.reply).toBe("WORDS");
    expect(practiceStep(asked, { type: "choose", choice: "match" }).outcome).toBe("pass");
    expect(practiceStep(asked, { type: "choose", choice: "hangup" }).outcome).toBe("soft");
  });
  it("switches scenario and starts it ringing", () => {
    const s = practiceStep(run("jail", [{ type: "answer" }]), { type: "select", scenario: "bank" });
    expect(s).toEqual(start("bank"));
  });
  it("can restart", () => {
    expect(practiceStep(run("jail", [{ type: "answer" }]), { type: "restart" })).toEqual(start("jail"));
  });
});

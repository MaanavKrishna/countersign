import { describe, expect, it } from "vitest";
import { UNLOCK_MS, lockState } from "@/lib/family/lock";

describe("word lock", () => {
  it("shows words when no lock is set", () => {
    expect(lockState(null, 0, 1000)).toBe("open");
  });
  it("hides words when a lock is set and the phone hasn't been unlocked", () => {
    expect(lockState({ credentialId: "abc" }, 0, 1000)).toBe("locked");
  });
  it("stays open for five minutes after an unlock, then locks again", () => {
    const at = 1_000_000;
    expect(lockState({ credentialId: "abc" }, at, at + UNLOCK_MS - 1)).toBe("open");
    expect(lockState({ credentialId: "abc" }, at, at + UNLOCK_MS)).toBe("locked");
    expect(UNLOCK_MS).toBe(5 * 60_000);
  });
});

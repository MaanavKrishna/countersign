import { describe, expect, it } from "vitest";
import { scrubUrl } from "../privacy";

describe("scrubUrl", () => {
  it("drops the fragment, where family secrets travel", () => {
    expect(scrubUrl("https://x.app/family/join#v=2&s=SECRET&c=Krishna")).toBe("https://x.app/family/join");
    expect(scrubUrl("https://x.app/family/pair#s=SECRET")).toBe("https://x.app/family/pair");
  });
  it("drops the query, where shared message text arrives", () => {
    expect(scrubUrl("https://x.app/share?text=Your%20account%20is%20locked&url=https://evil")).toBe("https://x.app/share");
  });
  it("keeps plain paths and survives junk", () => {
    expect(scrubUrl("https://x.app/evidence")).toBe("https://x.app/evidence");
    expect(scrubUrl("not a url")).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { composeSharedText } from "../share";

describe("composeSharedText", () => {
  it("joins title, text and url", () => {
    expect(composeSharedText({ title: "USPS", text: "Package on hold", url: "https://x.top/a" })).toBe("USPS\nPackage on hold\nhttps://x.top/a");
  });
  it("doesn't repeat the url when the text already contains it", () => {
    expect(composeSharedText({ text: "pay at https://x.top/a now", url: "https://x.top/a" })).toBe("pay at https://x.top/a now");
  });
  it("drops a title that duplicates the text", () => {
    expect(composeSharedText({ title: "Pay now", text: "Pay now" })).toBe("Pay now");
  });
  it("works with only a url", () => {
    expect(composeSharedText({ url: "https://x.top/a" })).toBe("https://x.top/a");
  });
  it("caps length", () => {
    expect(composeSharedText({ text: "a".repeat(30000) }).length).toBe(20000);
  });
});

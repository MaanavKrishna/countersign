import { expect, test } from "@playwright/test";

test("practice call: ask, hear the dodge, hang up, pass", async ({ page }) => {
  await page.addInitScript(() => {
    // Silent stand-in voice that never finishes on its own; the Next button drives the call.
    Object.defineProperty(window, "speechSynthesis", { value: { speak() {}, cancel() {} } });
  });
  await page.goto("/family/practice");
  await page.getByRole("button", { name: "Answer" }).click();
  while (await page.getByRole("button", { name: /Next line/ }).isVisible()) await page.getByRole("button", { name: /Next line/ }).click();
  await page.getByRole("button", { name: /What's our countersign/ }).click();
  await expect(page.getByText(/no time for games/)).toBeVisible();
  await page.getByRole("button", { name: "Hang up and call back" }).click();
  await expect(page.getByRole("heading", { name: "You passed." })).toBeVisible();
});

test("practice call advances one line per tap even when cancel fires 'end' (Safari)", async ({ page }) => {
  await page.addInitScript(() => {
    let current: SpeechSynthesisUtterance | null = null;
    const fake = {
      speak(u: SpeechSynthesisUtterance) {
        current = u;
      },
      cancel() {
        const u = current;
        current = null;
        u?.onend?.call(u, {} as SpeechSynthesisEvent);
      },
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake });
  });
  await page.goto("/family/practice");
  await page.getByRole("button", { name: "Answer" }).click();
  const line = page.locator("[aria-live=polite]");
  await expect(line).toContainText("It's me");
  await page.getByRole("button", { name: /Next line/ }).click();
  await expect(line).toContainText("There was an accident");
  await page.getByRole("button", { name: /Next line/ }).click();
  await expect(line).toContainText("don't tell Mom");
});

test("without speech, the script stays readable", async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error simulate a browser with no speech synthesis
    delete Window.prototype.speechSynthesis;
    // @ts-expect-error same
    delete window.speechSynthesis;
  });
  await page.goto("/family/practice");
  await expect(page.getByText(/can't speak/)).toBeVisible();
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("[aria-live=polite]")).toContainText("It's me");
});

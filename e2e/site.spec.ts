import { expect, test } from "@playwright/test";

const PAGES = ["/", "/family", "/family/practice", "/family/card", "/check", "/shield", "/evidence"];

for (const path of PAGES) {
  test(`${path} renders on a 390px phone without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("the family pages work offline after the first visit", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  // Wait until the worker controls the page and has finished precaching.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);
  await context.setOffline(true);
  await page.goto("/family");
  await expect(page.getByRole("heading", { name: "Family Circle", exact: true })).toBeVisible();
  await page.goto("/family/practice");
  await expect(page.getByRole("button", { name: "Answer" })).toBeVisible();
});

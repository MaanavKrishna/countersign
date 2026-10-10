import { expect, test } from "@playwright/test";

test("Call Shield on-phone mode reaches danger without sending the transcript", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/shield")) sent.push(r.url());
  });
  await page.goto("/shield");
  await page.getByLabel(/Keep the call on this phone/).check();
  await page.getByRole("button", { name: /grandson in jail/ }).click();
  await expect(page.getByText(/STOP\. DON'T SEND MONEY/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("checked on this phone")).toBeVisible();
  expect(sent).toHaveLength(0);
});

test("Call Shield falls back to on-phone rules when the service is unreachable", async ({ page }) => {
  await page.route("**/api/shield", (r) => r.abort());
  await page.goto("/shield");
  await page.getByRole("button", { name: /grandson in jail/ }).click();
  await expect(page.getByText(/STOP\. DON'T SEND MONEY/i)).toBeVisible({ timeout: 30_000 });
});

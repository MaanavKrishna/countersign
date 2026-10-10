import { expect, test } from "@playwright/test";

test("words can be locked behind the phone's screen lock", async ({ page, context }) => {
  // A virtual platform authenticator that always verifies the user (like Face ID succeeding).
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });

  await page.goto("/family");
  await page.getByLabel("Circle name").fill("Test family");
  await page.getByLabel("Your name (what family calls you)").fill("Grandma");
  await page.getByLabel(/Everyone else/).fill("Ethan");
  await page.getByRole("button", { name: "Create circle" }).click();
  const words = page.locator("p[aria-live]").first();
  await expect(words).toHaveText(/\w+ · \w+ · \w+/);

  await page.getByRole("button", { name: "Lock with Face ID or fingerprint" }).click();
  await expect(page.getByText("Words are locked on this phone.")).toBeVisible();
  await page.getByRole("button", { name: "Lock now" }).click();
  await expect(page.locator("p[aria-live]")).toHaveCount(0);

  await page.getByRole("button", { name: "Unlock to see the words" }).first().click();
  await expect(page.locator("p[aria-live]").first()).toHaveText(/\w+ · \w+ · \w+/);

  // Showing the circle's QR code (which carries the secret) also needs the screen lock.
  await page.getByRole("button", { name: "Lock now" }).click();
  await cdp.send("WebAuthn.setUserVerified", { authenticatorId, isUserVerified: false });
  await page.getByRole("button", { name: "Add someone" }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByAltText(/Join QR code/)).toHaveCount(0);
  await cdp.send("WebAuthn.setUserVerified", { authenticatorId, isUserVerified: true });
  await page.getByRole("button", { name: "Add someone" }).click();
  await expect(page.getByAltText(/Join QR code/)).toBeVisible();

  // A reload forgets the unlock.
  await page.reload();
  await expect(page.getByRole("button", { name: "Unlock to see the words" }).first()).toBeVisible();
});

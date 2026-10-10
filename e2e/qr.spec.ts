import { expect, test } from "@playwright/test";
import path from "node:path";
import QRCode from "qrcode";

// A real screenshot: anti-aliased, scaled QR code inside a message card. jsQR alone misses these
// at full size, which silently dropped the hidden link before this test existed.
test("a screenshot's QR code link reaches the investigator", async ({ page }) => {
  const url = "https://usps-redelivery-schedule.top/notice/9400";
  const qr = await QRCode.toDataURL(url, { margin: 2, width: 360 });
  const shot = await page.context().newPage();
  await shot.setViewportSize({ width: 520, height: 720 });
  await shot.setContent(`<body style="margin:0;font-family:system-ui;background:#f4f4f4"><div style="margin:24px;padding:28px;background:#fff;border-radius:16px"><b style="font-size:26px">USPS</b><p style="font-size:20px">We attempted delivery. Scan the QR code to schedule a redelivery.</p><img src="${qr}" width="300" style="display:block;margin:12px auto"/></div></body>`);
  const png = await shot.screenshot({ fullPage: true });
  await shot.close();

  let sent: { text: string } | null = null;
  await page.route("**/api/investigate", async (route) => {
    sent = JSON.parse(route.request().postData() ?? "{}");
    await route.abort();
  });
  await page.goto("/check");
  await page.locator('input[type="file"]').setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Investigate" }).click();
  await expect.poll(() => sent?.text ?? "").toContain(url);
});

test("a screenshot that jsQR alone can't read at full size still works", async ({ page }) => {
  let sent: { text: string } | null = null;
  await page.route("**/api/investigate", async (route) => {
    sent = JSON.parse(route.request().postData() ?? "{}");
    await route.abort();
  });
  await page.goto("/check");
  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "usps-qr-screenshot.png"));
  await page.getByRole("button", { name: "Investigate" }).click();
  await expect.poll(() => sent?.text ?? "").toContain("https://usps-redelivery-schedule.top/notice/9400");
});

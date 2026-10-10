import { expect, test, type Browser, type Page } from "@playwright/test";

// Mid-minute, so neither phone shows a "clock may differ" alternative.
const NOW = new Date("2026-10-10T12:00:30Z");
const STORE = "countersign.family.v1";

async function phone(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
  return page;
}

type StoredCircle = { secret: string; name: string; members: string[]; lang: string; replaces?: string };

async function circles(page: Page): Promise<StoredCircle[]> {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").circles ?? [], STORE);
}

function joinLink(c: StoredCircle): string {
  const f = new URLSearchParams({ v: "2", s: c.secret, c: c.name, m: c.members.join(","), l: c.lang });
  if (c.replaces) f.set("r", c.replaces);
  return `/family/join#${f}`;
}

async function createCircle(page: Page) {
  await page.goto("/family");
  await page.getByLabel("Circle name").fill("Test family");
  await page.getByLabel("Your name (what family calls you)").fill("Grandma");
  await page.getByLabel(/Everyone else/).fill("Ethan, Lucía");
  await page.getByRole("button", { name: "Create circle" }).click();
  await expect(page.getByAltText(/Join QR code/)).toBeVisible();
}

async function ownWords(page: Page): Promise<string> {
  const block = page.locator("div", { has: page.getByText("Your words, only when you call family") }).last();
  const words = block.locator("p[aria-live]").first();
  await expect(words).toHaveText(/\w+ · \w+ · \w+/);
  return (await words.innerText()).toLowerCase();
}

test("two phones: the caller's words match what Grandma's phone expects", async ({ browser }) => {
  const grandma = await phone(browser);
  await createCircle(grandma);
  const [circle] = await circles(grandma);

  const ethan = await phone(browser);
  await ethan.goto(joinLink(circle));
  await expect(ethan).toHaveURL(/\/family\/join$/); // secret removed from the address bar
  await ethan.getByRole("button", { name: "Ethan", exact: true }).click();
  await expect(ethan.getByRole("heading", { name: /You joined Test family as Ethan/ })).toBeVisible();
  await ethan.goto("/family");
  const said = await ownWords(ethan);

  await grandma.getByRole("button", { name: /Who's calling\? Check now/ }).first().click();
  const dialog = grandma.getByRole("dialog", { name: "Who's calling?" });
  await dialog.getByRole("button", { name: "Ethan", exact: true }).click();
  const expected = (await dialog.locator("p[aria-live]").innerText()).toLowerCase().split(/\s+/).join(" · ");
  expect(said).toBe(expected);
  await dialog.getByRole("button", { name: "The words match" }).click();
  await expect(dialog.getByRole("heading", { name: /It's really Ethan/ })).toBeVisible();
});

test("starting fresh replaces the old circle on a member's phone", async ({ browser }) => {
  const grandma = await phone(browser);
  await createCircle(grandma);
  const [before] = await circles(grandma);
  const ethan = await phone(browser);
  await ethan.goto(joinLink(before));
  await ethan.getByRole("button", { name: "Ethan", exact: true }).click();
  await expect(ethan.getByRole("heading", { name: /You joined/ })).toBeVisible();

  grandma.on("dialog", (d) => void d.accept());
  await grandma.getByText("New phone, lost phone, or someone left?").click();
  await grandma.getByLabel("Remove someone (optional)").selectOption("Lucía");
  await grandma.getByRole("button", { name: "Start fresh with new words" }).click();
  await expect(grandma.getByAltText(/Join QR code/)).toBeVisible();
  const [after] = await circles(grandma);
  expect(after.secret).not.toBe(before.secret);
  expect(after.members).toEqual(["Grandma", "Ethan"]);

  await ethan.goto("/family"); // a scanned QR code opens a fresh page, not a hash change
  await ethan.goto(joinLink(after));
  await expect(ethan.getByText(/has started fresh with new words/)).toBeVisible();
  await ethan.getByRole("button", { name: "Ethan", exact: true }).click();
  await expect(ethan.getByRole("heading", { name: /You joined/ })).toBeVisible();
  const mine = await circles(ethan);
  expect(mine).toHaveLength(1);
  expect(mine[0].secret).toBe(after.secret);
});

test("home-screen shortcut opens Who's calling, Escape closes it for good", async ({ browser }) => {
  const grandma = await phone(browser);
  await createCircle(grandma);
  await grandma.goto("/family?check=1");
  const dialog = grandma.getByRole("dialog", { name: "Who's calling?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await grandma.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(grandma).toHaveURL(/\/family$/);
  await grandma.reload();
  await expect(grandma.getByRole("dialog")).toBeHidden();
});

test("an invalid join link is refused", async ({ page }) => {
  await page.goto("/family/join#v=2&s=short&c=x&m=a");
  await expect(page.getByRole("heading", { name: /isn't valid/ })).toBeVisible();
});

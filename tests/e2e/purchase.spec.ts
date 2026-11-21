import { expect, test, type Page } from "@playwright/test";

const purchase = (page: Page) => page.locator("#editions");
const summary = (page: Page) => purchase(page).locator("dl");
const sticky = (page: Page) => page.locator("[data-sticky-purchase]");
const scrollToEl = (page: Page, selector: string, offset = 0) =>
  page.evaluate(([s, o]) => window.scrollTo(0, document.querySelector<HTMLElement>(s as string)!.offsetTop + (o as number)), [selector, offset] as const);

test.describe("purchase configurator", () => {
  test("platform selection updates the summary and artwork", async ({ page }) => {
    await page.goto("/");
    const xbox = purchase(page).getByRole("radio", { name: "Xbox Series X|S" });
    await expect(purchase(page).getByRole("radio", { name: "PlayStation 5" })).toBeChecked();
    await purchase(page).locator("label", { hasText: "Xbox Series X|S" }).click();
    await expect(xbox).toBeChecked();
    await expect(summary(page)).toContainText("Xbox Series X|S");
    await expect(purchase(page).getByRole("img", { name: /for Xbox Series X\|S/ })).toBeVisible();
  });

  test("edition selection updates the summary and CTA", async ({ page }) => {
    await page.goto("/");
    await purchase(page).locator("label", { hasText: "Ultimate Edition" }).click();
    await expect(purchase(page).getByRole("radio", { name: /Ultimate Edition/ })).toBeChecked();
    await expect(summary(page)).toContainText("Ultimate Edition");
    await expect(purchase(page).getByRole("button", { name: "Buy Ultimate Edition" }).or(purchase(page).getByRole("link", { name: "Buy Ultimate Edition" }))).toBeVisible();
  });

  test("configured prices show in the summary and comparison", async ({ page }) => {
    await page.goto("/");
    await expect(summary(page)).toContainText("$19.00");
    await expect(page.locator("#compare")).toContainText("$39.00");
  });
});

test.describe("checkout stays disabled", () => {
  test("every buy control is disabled and explains why", async ({ page }) => {
    await page.goto("/");
    test.skip((await page.locator("main[data-content-preview]").count()) > 0, "live builds only (preview opens checkout)");
    const buys = page.getByRole("button", { name: /^Buy /, includeHidden: true });
    expect(await buys.count()).toBeGreaterThanOrEqual(2);
    for (const button of await buys.all()) await expect(button).toBeDisabled();
    await expect(purchase(page).getByRole("button", { name: /^Buy / })).toHaveAccessibleDescription(/Checkout opens once/);
  });
});

test.describe("edition comparison", () => {
  test("choosing an edition syncs the configurator and returns to it", async ({ page }) => {
    await page.goto("/");
    const compare = page.locator("#compare");
    await compare.scrollIntoViewIfNeeded();
    await compare.getByRole("button", { name: "Choose Ultimate Edition" }).click();
    await expect(page.locator("#purchase-panel")).toBeInViewport({ ratio: 0.2 });
    await expect(purchase(page).getByRole("radio", { name: /Ultimate Edition/ })).toBeChecked();
    await expect(compare.getByRole("button", { name: "Continue with Ultimate Edition" })).toBeAttached();
  });

  test("comparison prices follow the selected platform", async ({ page }) => {
    await page.goto("/");
    await purchase(page).locator("label", { hasText: "Xbox Series X|S" }).click();
    await expect(page.locator("#compare")).toContainText("Prices shown for Xbox Series X|S");
  });
});

test.describe("sticky purchase bar", () => {
  test.use({ reducedMotion: "reduce" });

  test("appears after the hero and hides near the main controls and footer", async ({ page }) => {
    await page.goto("/");
    await expect(sticky(page)).toHaveAttribute("data-visible", "false");

    await scrollToEl(page, "#compare", 200);
    await expect(sticky(page)).toHaveAttribute("data-visible", "true");
    await expect(sticky(page)).toContainText("Standard Edition");
    await expect(sticky(page)).toContainText("PS5");

    await scrollToEl(page, "#purchase-panel", -100);
    await expect(sticky(page)).toHaveAttribute("data-visible", "false");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(sticky(page)).toHaveAttribute("data-visible", "false");
  });

  test("reflects the current selection and stays inside the viewport", async ({ page }) => {
    await page.goto("/");
    await purchase(page).locator("label", { hasText: "Ultimate Edition" }).click();
    await scrollToEl(page, "#compare", 200);
    await expect(sticky(page)).toHaveAttribute("data-visible", "true");
    await expect(sticky(page)).toContainText("Ultimate Edition");
    await expect(sticky(page)).toBeInViewport({ ratio: 1 });
    const box = (await sticky(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(box.width).toBeLessThanOrEqual(viewport.width);
  });
});

test.describe("mobile layouts", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile only"));

  test("purchase and comparison stack, nothing overflows", async ({ page }) => {
    await page.goto("/");
    const art = (await purchase(page).getByRole("img").boundingBox())!;
    const panel = (await page.locator("#purchase-panel").boundingBox())!;
    expect(panel.y).toBeGreaterThan(art.y + art.height - 1);

    const [first, second] = await page.locator("#compare article").all();
    const a = (await first!.boundingBox())!;
    const b = (await second!.boundingBox())!;
    expect(b.y).toBeGreaterThan(a.y + a.height - 1);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

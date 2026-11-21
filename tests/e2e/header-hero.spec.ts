import { expect, test } from "@playwright/test";

test("every nav link targets an existing section", async ({ page }) => {
  await page.goto("/");
  // The menu is built from the enabled home page blocks (Admin → Homepage): read it, do not assume it.
  const hrefs = await page.locator(`nav[aria-label="Primary"] a`).evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  for (const h of ["#overview", "#editions", "#explore", "#trailers"]) expect(hrefs).toContain(h);
  for (const href of hrefs) await expect(page.locator(href)).toHaveCount(1);
});

test("hero shows product, CTAs and only verified facts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Grand Theft Auto\s+VI/);
  await expect(page.locator("#overview").getByRole("link", { name: "Get GTA VI" })).toHaveAttribute("href", "#editions");
  await expect(page.getByRole("link", { name: "Watch trailer" })).toHaveAttribute("href", "#trailers");
  // No release/status line in the hero (removed by request). The only price is the server catalog minimum.
  await expect(page.locator("#overview")).not.toContainText("Released November 19, 2026");
  await expect(page.locator("#overview")).toContainText("Standard Edition from $19.00");
});

test("Buy now scrolls to editions without enabling checkout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Buy now" }).click();
  await expect(page.locator("#editions")).toBeInViewport();
  for (const button of await page.getByRole("button", { name: /^Buy /, includeHidden: true }).all()) {
    await expect(button).toBeDisabled();
  }
});

test("floating glass header deepens after scrolling; nav pill follows the section", async ({ page, isMobile }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header).not.toHaveAttribute("data-scrolled");
  await page.mouse.wheel(0, 600);
  await expect(header).toHaveAttribute("data-scrolled", "true");
  if (isMobile) return;
  const nav = header.getByRole("navigation", { name: "Primary" });
  for (const label of ["Home", "Editions", "Explore", "Trailers", "FAQ"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
  await nav.getByRole("link", { name: "Editions" }).click();
  await expect(nav.getByRole("link", { name: "Editions" })).toHaveAttribute("aria-current", "location");
  await nav.getByRole("link", { name: "Explore" }).focus();
  await expect(nav.getByRole("link", { name: "Explore" })).toBeFocused();
});

test.describe("mobile menu", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile only"));

  test("opens, navigates and closes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.getByRole("link", { name: "Explore" }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator("#explore")).toBeInViewport();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("hero copy is visible immediately", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/motion-ok/);
    const opacity = await page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });
});

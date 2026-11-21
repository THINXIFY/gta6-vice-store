import { expect, test } from "@playwright/test";

test("every nav link targets an existing section", async ({ page }) => {
  await page.goto("/");
  const hrefs = ["#overview", "#editions", "#explore", "#trailers"];
  for (const href of hrefs) {
    await expect(page.locator(href)).toHaveCount(1);
  }
});

test("hero shows product, CTAs and only verified facts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Grand Theft Auto\s+VI/);
  await expect(page.locator("#overview").getByRole("link", { name: "Get GTA VI" })).toHaveAttribute("href", "#editions");
  await expect(page.getByRole("link", { name: "Watch trailer" })).toHaveAttribute("href", "#trailers");
  await expect(page.locator("#overview")).toContainText("PlayStation 5");
  // Release date is verified (rockstargames.com/VI). The only price is the server catalog minimum.
  await expect(page.locator("#overview")).toContainText("Released November 19, 2026");
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

test("header gains a solid background after scrolling", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header).not.toHaveClass(/bg-obsidian(\s|$)/);
  await page.mouse.wheel(0, 600);
  await expect(header).toHaveClass(/bg-obsidian(\s|$)/);
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

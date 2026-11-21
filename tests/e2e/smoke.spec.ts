import { expect, test } from "@playwright/test";

test.describe("foundation smoke", () => {
  test("renders, has no console errors and no horizontal overflow", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The non-affiliation notice lives in the footer (and near checkout); the hero no longer repeats it.

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test("purchase buttons stay disabled while checkout is off", async ({ page }) => {
    await page.goto("/");
    for (const button of await page.getByRole("button", { name: /^Buy /, includeHidden: true }).all()) {
      await expect(button).toBeDisabled();
    }
  });

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("content is visible without animation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    const card = page.getByRole("heading", { name: "Standard Edition" });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    expect(await card.evaluate((el) => getComputedStyle(el.closest("article")!).opacity)).toBe("1");
  });
});

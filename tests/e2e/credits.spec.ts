import { expect, test } from "@playwright/test";

test("footer links to media credits", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("contentinfo").getByRole("link", { name: "Media credits" });
  await expect(link).toHaveAttribute("href", "/credits");
});

test("credits page acknowledges rights holders", async ({ page }) => {
  await page.goto("/credits");
  await expect(page.getByRole("heading", { level: 1, name: "Media credits" })).toBeVisible();
  const main = page.locator("main");
  await expect(main).toContainText("trademarks of Take-Two Interactive Software, Inc.");

  for (const a of await main.locator('a[target="_blank"]').all()) {
    await expect(a).toHaveAttribute("rel", /noopener/);
    await expect(a).toHaveAttribute("href", /^https:\/\//);
  }

});

test("header navigation from credits returns to landing sections", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop nav");
  await page.goto("/credits");
  const link = page.getByRole("banner").getByRole("link", { name: "Editions" });
  await expect(link).toHaveAttribute("href", "/#editions");
  await link.click();
  await expect(page).toHaveURL(/\/#editions$/);
  await expect(page.locator("#editions")).toBeAttached();
});

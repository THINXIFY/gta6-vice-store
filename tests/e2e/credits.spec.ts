import { expect, test } from "@playwright/test";

test("footer links to media credits", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("contentinfo").getByRole("link", { name: "Media credits" });
  await expect(link).toHaveAttribute("href", "/credits");
});

test("credits page acknowledges rights holders and stays honest about permission", async ({ page }) => {
  await page.goto("/credits");
  await expect(page.getByRole("heading", { level: 1, name: "Media credits" })).toBeVisible();
  const main = page.locator("main");
  await expect(main).toContainText("trademarks of Take-Two Interactive Software, Inc.");
  await expect(main).toContainText("Crediting a work is not the same as permission");

  for (const a of await main.locator('a[target="_blank"]').all()) {
    await expect(a).toHaveAttribute("rel", /noopener/);
    await expect(a).toHaveAttribute("href", /^https:\/\//);
  }

  // Supplied imagery is listed only when this build may show it.
  const supplied = main.locator('img[src*="preview-media"], img[srcset*="preview-media"]');
  if ((await page.locator("main[data-media-preview]").count()) === 0 && !(await supplied.count())) {
    await expect(main).toContainText("No supplied artwork is shown on this site yet.");
  }
});

test("credits page has no unlicensed media in live builds", async ({ page }) => {
  await page.goto("/");
  const preview = (await page.locator("main[data-media-preview]").count()) > 0;
  test.skip(preview, "live builds only");
  await page.goto("/credits");
  await expect(page.locator('img[src*="preview-media"], img[srcset*="preview-media"]')).toHaveCount(0);
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

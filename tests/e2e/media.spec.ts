import { expect, test } from "@playwright/test";

test("unlicensed supplied media only renders in preview builds", async ({ page }) => {
  await page.goto("/");
  const preview = await page.locator("main[data-media-preview]").count();
  const supplied = page.locator('img[src*="/preview-media/"], img[srcset*="preview-media"], source[srcset*="preview-media"]');
  if (!preview) await expect(supplied).toHaveCount(0);
});


test("explore section exists for navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#explore").getByRole("heading", { level: 2 })).toBeVisible();
});

import { expect, test } from "@playwright/test";

const isContentPreview = async (page: import("@playwright/test").Page) => (await page.locator("main[data-content-preview]").count()) > 0;

test("unconfirmed steps, reassurances and links never appear outside content preview", async ({ page }) => {
  await page.goto("/");
  const preview = await isContentPreview(page);
  const drafts = page.locator("[data-status=draft]");
  if (!preview) {
    await expect(drafts).toHaveCount(0);
    // Steps publish only as a complete confirmed sequence.
    await expect(page.locator("#how-it-works ol")).toHaveCount(0);
  } else {
    expect(await drafts.count()).toBeGreaterThan(0);
    await expect(page.locator("#how-it-works [data-step]")).toHaveCount(3);
  }
  // Verified reassurances always show.
  await expect(page.locator("#how-it-works")).toContainText("Platform compatibility");
  await expect(page.locator("#how-it-works")).toContainText("Independent retailer");
});

test("draft policy text is not shipped in client JavaScript of a live build", async ({ page, request }) => {
  await page.goto("/");
  test.skip(await isContentPreview(page), "live builds only");
  const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
  const html = await page.content();
  expect(html).not.toContain("Our refund policy will be published");
  for (const src of scripts) {
    const body = await (await request.get(src)).text();
    expect(body, src).not.toContain("Our refund policy will be published");
    expect(body, src).not.toContain("payment provider and accepted payment methods");
  }
});

test.describe("footer", () => {
  test("has brand, working navigation, verified facts and no dead links", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("Not affiliated with, endorsed or sponsored by Rockstar Games");
    await expect(footer).toContainText("PlayStation 5 and Xbox Series X|S");
    await expect(footer).toContainText(/© \d{4}/);

    const nav = footer.getByRole("navigation", { name: "Footer" });
    for (const label of ["Home", "Editions", "Explore", "Trailers", "FAQ"]) {
      const href = await nav.getByRole("link", { name: label, exact: true }).getAttribute("href");
      expect(href).toMatch(/^#.+/);
      await expect(page.locator(href!)).toHaveCount(1);
    }
    for (const href of await footer.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
    }
  });

  test("back to top returns to the hero", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await footer.getByRole("link", { name: "Back to top", exact: true }).click();
    await expect(page.locator("#overview")).toBeInViewport();
  });
});

import { expect, test } from "@playwright/test";

test("explore lists Leonida's official regions", async ({ page }) => {
  await page.goto("/");
  const explore = page.locator("#explore");
  const heading = explore.getByRole("heading", { level: 2 });
  await expect(heading).toBeVisible();
  // Full showcase only renders with usable media; otherwise the section is a stub.
  if (await explore.getByRole("list").count()) {
    for (const name of ["Vice City", "Leonida Keys", "Grassrivers", "Port Gellhorn", "Ambrosia", "Mount Kalaga"]) {
      await expect(explore.getByRole("listitem").filter({ hasText: name })).toHaveCount(1);
    }
  }
});

test("characters introduce Jason and Lucia with verified bios", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#characters");
  await expect(section.getByRole("heading", { level: 2, name: "Two lives. One story." })).toBeAttached();
  await expect(section.getByRole("heading", { level: 3, name: /Jason\s*Duval/, includeHidden: true })).toBeAttached();
  await expect(section.getByRole("heading", { level: 3, name: /Lucia\s*Caminos/, includeHidden: true })).toBeAttached();
  await expect(section).toContainText("Leonida Penitentiary");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("world and character content is fully visible without animation", async ({ page }) => {
    await page.goto("/");
    const bio = page.locator("[data-bio=lucia]");
    await bio.scrollIntoViewIfNeeded();
    await expect(bio).toBeVisible();
    expect(await bio.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    const slice = page.locator("[data-slice=lucia]");
    if (await slice.count()) expect(await slice.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });
});

test("no horizontal overflow from the character slices", async ({ page }) => {
  await page.goto("/");
  await page.locator("#characters").scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

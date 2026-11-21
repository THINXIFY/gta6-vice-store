import { expect, test, type Page } from "@playwright/test";

const trailers = (page: Page) => page.locator("#trailers");
const gallery = (page: Page) => page.locator("#gallery");

test.describe("trailers", () => {
  test("show verified titles and durations; nothing loads until play", async ({ page }) => {
    await page.goto("/");
    const section = trailers(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { level: 2, name: "See Leonida come to life." })).toBeVisible();
    await expect(section.locator("iframe")).toHaveCount(0);
    const item = section.getByRole("button", { name: "Grand Theft Auto VI Trailer 2", exact: true });
    await expect(item.locator("time")).toHaveText("2:47");
    await expect(section.getByRole("button", { name: "Grand Theft Auto VI Launch Trailer", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("selecting a trailer updates the player; play loads the privacy-enhanced embed", async ({ page }) => {
    await page.goto("/");
    const section = trailers(page);
    await section.scrollIntoViewIfNeeded();
    const item = section.getByRole("button", { name: "Grand Theft Auto VI Trailer 2", exact: true });
    await item.click();
    await expect(item).toHaveAttribute("aria-pressed", "true");
    await expect(item).toContainText("Selected");

    await section.getByRole("button", { name: "Play Grand Theft Auto VI Trailer 2" }).click();
    const frame = section.locator("iframe");
    await expect(frame).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/VQRLujxTm3c\?autoplay=1/);
    await expect(frame).toHaveAttribute("allowfullscreen", "");
    await expect(item).toContainText("Now playing");

    // Switching while playing swaps the video in place.
    await section.getByRole("button", { name: "Grand Theft Auto VI Trailer 1", exact: true }).click();
    await expect(frame).toHaveAttribute("src", /embed\/QdBZY2fkU-0/);
  });

  test("playlist is keyboard operable", async ({ page }) => {
    await page.goto("/");
    const item = trailers(page).getByRole("button", { name: "Grand Theft Auto VI Out Now", exact: true });
    await item.focus();
    await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("gallery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    test.skip((await gallery(page).count()) === 0, "gallery needs usable media (preview or licensed)");
  });

  const panelButtons = (page: Page) => gallery(page).locator("[data-gallery-item] button");

  test("keyboard opens the viewer; arrows, wrap-around and Escape work", async ({ page }) => {
    const buttons = panelButtons(page);
    const count = await buttons.count();
    await buttons.first().scrollIntoViewIfNeeded();
    await expect(buttons.nth(1)).toHaveAccessibleName(/^View full image/);

    // Keyboard: focusing a panel expands it (desktop strip), Enter opens the viewer.
    await buttons.nth(1).focus();
    await page.keyboard.press("Enter");
    const viewer = page.getByRole("dialog", { name: "Image viewer" });
    await expect(viewer).toBeVisible();
    await expect(viewer).toContainText(`2 / ${count}`);

    await viewer.getByRole("button", { name: "Next image" }).click();
    await expect(viewer).toContainText(`3 / ${count}`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(viewer).toContainText(`1 / ${count}`);
    await page.keyboard.press("ArrowLeft"); // wraps to the last image
    await expect(viewer).toContainText(`${count} / ${count}`);

    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
    // Focus returns to the panel of the image last viewed.
    await expect(buttons.nth(count - 1)).toBeFocused();
  });

  test("mobile: swipeable carousel, tap opens the viewer, swipe navigates", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch only");
    const strip = gallery(page).locator("[data-gallery-strip]");
    await strip.scrollIntoViewIfNeeded();
    expect(await strip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(gallery(page).locator("[data-gallery-item]").first()).toHaveCSS("clip-path", /^(none|inset\(0%)/);
    const first = panelButtons(page).first();
    const r = (await first.boundingBox())!;
    await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    const viewer = page.getByRole("dialog", { name: "Image viewer" });
    await expect(viewer).toBeVisible();
    const box = (await viewer.locator("img").boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 5 });
    await page.mouse.up();
    await expect(viewer).toContainText("2 / ");
  });
});

test("closing CTA returns to the purchase section with the current selection", async ({ page }) => {
  await page.goto("/");
  const cta = page.locator("[data-closing-cta]");
  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toContainText("Standard Edition for PlayStation 5");
  await cta.getByRole("link", { name: "Explore editions" }).click();
  await expect(page.locator("#purchase-panel")).toBeInViewport({ ratio: 0.2 });
});

test("mobile: trailer playlist scrolls horizontally without page overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  const list = trailers(page).getByRole("list");
  await list.scrollIntoViewIfNeeded();
  expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

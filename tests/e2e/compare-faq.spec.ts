import { expect, test } from "@playwright/test";

test.describe("edition comparison", () => {
  test("Ultimate first, verified contents with included and excluded marks", async ({ page }) => {
    await page.goto("/");
    const compare = page.locator("#compare");
    await expect(compare.getByRole("heading", { level: 2, name: "Compare GTA VI editions" })).toBeAttached();
    const panels = compare.locator("article");
    await expect(panels.nth(0)).toHaveAttribute("aria-labelledby", "compare-ultimate");
    await expect(panels.nth(1)).toHaveAttribute("aria-labelledby", "compare-standard");

    const ultimate = panels.nth(0);
    const standard = panels.nth(1);
    await expect(ultimate.locator("li", { hasText: "(included)" })).toHaveCount(17);
    await expect(standard.locator("li", { hasText: "(included)" })).toHaveCount(1);
    await expect(standard.locator("li", { hasText: "Digital Standard Edition" })).toContainText("(included)");
    await expect(standard.locator("li", { hasText: "’95 Grotti Cheetah" })).toContainText("(not included)");
  });

  test("Standard is selected by default and choosing Ultimate syncs everywhere", async ({ page }) => {
    await page.goto("/");
    const compare = page.locator("#compare");
    await expect(compare.getByRole("button", { name: "Continue with Standard Edition" })).toBeAttached();
    await compare.getByRole("button", { name: "Choose Ultimate Edition" }).click();
    await expect(page.locator("#editions").getByRole("radio", { name: /Ultimate Edition/ })).toBeChecked();
    await expect(compare.getByRole("button", { name: "Continue with Ultimate Edition" })).toBeAttached();
    await expect(page.locator("[data-closing-cta]")).toContainText("Ultimate Edition for PlayStation 5");
  });

  test("no early purchase bonuses are presented as available", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#compare")).not.toContainText(/Stanier|GTA\+/);
  });

  test("mobile: contents collapse and expand", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    const standard = page.locator("#compare article").nth(1);
    const toggle = standard.getByRole("button", { name: /contents of Standard Edition/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(standard.getByText("’95 Grotti Cheetah")).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(standard.getByText("’95 Grotti Cheetah")).toBeVisible();
  });
});

test.describe("FAQ", () => {
  test("accordion opens with keyboard and shows the answer", async ({ page }) => {
    await page.goto("/");
    const item = page.locator("#faq-platforms");
    const summary = item.locator("summary");
    await summary.scrollIntoViewIfNeeded();
    await expect(item).not.toHaveAttribute("open");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("open", "");
    await expect(item).toContainText("PlayStation 5 and Xbox Series X|S");
  });

  test("draft answers only appear in content preview builds", async ({ page }) => {
    await page.goto("/");
    const faq = page.locator("#faq");
    const drafts = await faq.locator("details[data-status=draft]").count();
    const questions = await faq.locator("details").count();
    if (drafts === 0) expect(questions).toBe(4); // live: verified answers only
    else expect(questions).toBe(12);
  });

  test("structured data reflects verified content only", async ({ page }) => {
    await page.goto("/");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const data = blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
    const game = data.find((d) => d["@type"] === "VideoGame")!;
    expect(game.name).toBe("Grand Theft Auto VI");
    expect(game).not.toHaveProperty("offers");
    expect(game).not.toHaveProperty("aggregateRating");
    const faq = data.find((d) => d["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
    expect(faq.mainEntity).toHaveLength(4);
    expect(faq.mainEntity.map((q) => q.name)).not.toContain("What is your refund policy?");
  });
});

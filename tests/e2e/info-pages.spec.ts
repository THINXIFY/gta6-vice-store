import { expect, test } from "@playwright/test";

/**
 * GTA-11A information pages. None is published yet (seller details unconfirmed), so live
 * builds must 404 them and never link to them; preview builds render them as marked,
 * noindex drafts with semantic headings and structured data.
 */

const PAGES = [
  { path: "/about", h1: "About VICE STORE", schema: "AboutPage" },
  { path: "/contact", h1: "Contact us", schema: "ContactPage" },
  { path: "/terms", h1: "Terms & Conditions", schema: "WebPage" },
  { path: "/privacy", h1: "Privacy Policy", schema: "WebPage" },
  { path: "/refund-policy", h1: "Refund Policy", schema: "WebPage" },
  { path: "/cookies", h1: "Cookie Policy", schema: "WebPage" },
];

for (const p of PAGES) {
  test(`${p.path}: unpublished draft is hidden live, marked and noindex in preview`, async ({ page }) => {
    const res = await page.goto(p.path);
    if (res!.status() === 404) {
      await page.goto("/");
      await expect(page.locator(`footer a[href="${p.path}"]`)).toHaveCount(0);
      return;
    }
    expect(res!.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.h1);
    await expect(page.locator("main")).toHaveAttribute("data-status", "draft");
    await expect(page.getByRole("note")).toContainText("not published");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${p.path}$`));
    // Unconfirmed business facts are visible markers, never invented values; the banner counts them.
    const marks = await page.locator("mark[data-pending]").count();
    if (marks) await expect(page.getByRole("note")).toContainText(`${marks} ${marks === 1 ? "detail needs" : "details need"} confirming`);
    else await expect(page.getByRole("note")).toContainText("Ready for review");
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as { "@type": string });
    expect(ld.map((d) => d["@type"])).toEqual(expect.arrayContaining([p.schema, "BreadcrumbList"]));
    // One h1, then h2 sections.
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.locator("article h2").count()).toBeGreaterThan(1);
    await expect(page.locator(`footer a[href="${p.path}"]`).first()).toBeAttached();
  });
}

test("privacy and cookie drafts disclose advertising, cookies and third parties", async ({ page }) => {
  const res = await page.goto("/privacy");
  test.skip(res!.status() === 404, "policies are unpublished in live builds");
  const main = page.locator("main");
  for (const text of ["does not currently show advertising", "Google AdSense", "Ads Settings", "CoinGecko", "privacy-enhanced mode", "private keys or recovery phrases"]) await expect(main).toContainText(text);
  await page.goto("/cookies");
  for (const text of ["do not use analytics, tracking or advertising cookies", "consent banner", "local storage"]) await expect(page.locator("main")).toContainText(text);
});

test("contact form validates, then saves a message with a reference", async ({ page, request }) => {
  const res = await page.goto("/contact");
  if (res!.status() === 404) {
    // Live build: the API refuses too.
    const api = await request.post("/api/support", { headers: { "x-forwarded-for": "10.8.1.1" }, data: { email: "a@b.co", topic: "other", message: "Hello there, a question." } });
    expect(api.status()).toBe(409);
    return;
  }
  await page.getByLabel("Email").fill("support-flow@example.com");
  await page.getByLabel("Your message is about").selectOption("payment");
  await page.getByLabel(/Payment ID/).fill("not-an-id");
  await page.getByLabel("Message", { exact: true }).fill("My payment has been submitted for a while. Could you check it?");
  await page.getByRole("button", { name: "Send message" }).click();
  // Browser validation blocks the malformed Payment ID; the server would also refuse it.
  await expect(page.getByRole("status")).toHaveCount(0);
  const bad = await request.post("/api/support", { headers: { "x-forwarded-for": "10.8.2.2" }, data: { email: "a@b.co", topic: "payment", paymentId: "nope", message: "Hello there, a question." } });
  expect(bad.status()).toBe(400);

  await page.getByLabel(/Payment ID/).fill("");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Message sent");
  await expect(page.getByRole("status")).toContainText(/SUP-[0-9A-Z]{6}/);

  // Honeypot: accepted silently, stored nowhere (reference is not real).
  const bot = await request.post("/api/support", { headers: { "x-forwarded-for": "10.8.3.3" }, data: { email: "bot@spam.co", topic: "other", message: "Buy cheap things now!!!", website: "http://spam" } });
  expect(bot.status()).toBe(200);
});

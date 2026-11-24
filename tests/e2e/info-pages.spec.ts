import { expect, test } from "@playwright/test";

/**
 * Information pages are published: each has one h1, indexable metadata (robots follow the site
 * setting), a canonical URL, structured data, a footer link and the support address.
 */

const PAGES = [
  { path: "/about", h1: "About VICE STORE", schema: "AboutPage" },
  { path: "/contact", h1: "Contact us", schema: "ContactPage" },
  { path: "/terms", h1: "Terms & Conditions", schema: "WebPage" },
  { path: "/privacy", h1: "Privacy Policy", schema: "WebPage" },
  { path: "/refund-policy", h1: "Refund & Cancellation Policy", schema: "WebPage" },
  { path: "/cookies", h1: "Cookie Policy", schema: "WebPage" },
];

for (const p of PAGES) {
  test(`${p.path}: published, structured and linked from the footer`, async ({ page }) => {
    const res = await page.goto(p.path);
    expect(res!.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.h1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).not.toHaveAttribute("data-status", "draft");
    await expect(page.locator("mark[data-pending]")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${p.path}$`));
    await expect(page.locator("main")).toContainText("Last updated");
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as { "@type": string });
    expect(ld.map((d) => d["@type"])).toEqual(expect.arrayContaining([p.schema, "BreadcrumbList"]));
    expect(await page.locator("main h2").count()).toBeGreaterThan(1);
    await expect(page.locator(`footer a[href="${p.path}"]`).first()).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

test("policies cover payments, data, cookies and the support address", async ({ page }) => {
  await page.goto("/privacy");
  for (const text of ["gta@vicestoregaming.com", "CoinGecko", "privacy-enhanced mode", "private keys or recovery phrases", "90 days"]) await expect(page.locator("main")).toContainText(text);
  await page.goto("/cookies");
  for (const text of ["do not use analytics, tracking or advertising cookies", "local storage"]) await expect(page.locator("main")).toContainText(text);
  await page.goto("/terms");
  for (const text of ["irreversible", "never approve payments automatically", "statutory rights"]) await expect(page.locator("main")).toContainText(text);
  await page.goto("/refund-policy");
  await expect(page.locator("main")).toContainText("same cryptocurrency and on the same network");
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

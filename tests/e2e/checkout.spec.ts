import { expect, test, type Page } from "@playwright/test";

// Each test is its own client for rate limiting (server trusts X-Forwarded-For in tests).
let clientSeq = 0;
test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "10.8." + (info.parallelIndex % 250) + "." + (++clientSeq % 250) });
});

const isPreview = async (page: Page) => (await page.locator("[data-checkout-preview]").count()) > 0;
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const txEvm = () => "0x" + hex(64);
/** Smallest valid PNG (1×1). */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

/** Opens the country picker, searches and chooses. */
async function pickRegion(page: Page, name: string) {
  await page.locator("[data-region-trigger]").click();
  await page.getByRole("combobox", { name: "Search countries" }).fill(name.slice(0, 4));
  await page.getByRole("option", { name, exact: true }).click();
  await expect(page.locator("[data-region-trigger]")).toContainText(name);
}

/** `method` = "ASSET:network", one of the five configured payment methods. */
async function startCheckout(page: Page, opts: { method?: string } = {}) {
  await page.goto("/checkout?edition=ultimate&platform=xbox-series");
  test.skip(!(await isPreview(page)), "checkout preview only");
  await page.getByLabel("Email for your order").fill("buyer@example.com");
  await pickRegion(page, "Pakistan");
  await page.locator(`[data-method="${opts.method ?? "USDT:tron"}"]`).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/\/checkout\/payment\?id=VICE-[0-9A-Z]{8}$/);
  return new URL(page.url()).searchParams.get("id")!;
}

test("prices are synchronized: $19.00 Standard, $39.00 Ultimate", async ({ page }) => {
  await page.goto("/");
  const purchase = page.locator("#editions");
  await expect(purchase.locator("label", { hasText: "Standard Edition" })).toContainText("$19.00");
  await expect(purchase.locator("label", { hasText: "Ultimate Edition" })).toContainText("$39.00");
  await purchase.locator("label", { hasText: "Xbox Series X|S" }).click();
  await expect(purchase.locator("label", { hasText: "Ultimate Edition" })).toContainText("$39.00");
});

test("live builds keep checkout closed", async ({ page, request }) => {
  await page.goto("/checkout");
  test.skip(await isPreview(page), "live builds only");
  await expect(page.getByRole("heading", { name: "Checkout isn’t open yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to payment" })).toHaveCount(0);
  const api = await request.post("/api/orders", { data: { edition: "standard", platform: "ps5", email: "a@b.co", region: "us", asset: "USDT", network: "tron" } });
  expect(api.status()).toBe(409);
  await page.goto("/");
  for (const b of await page.getByRole("button", { name: /^Buy /, includeHidden: true }).all()) await expect(b).toBeDisabled();
});

test("checkout carries the landing-page selection and offers exactly the five payment methods", async ({ page }) => {
  await page.goto("/checkout?edition=ultimate&platform=xbox-series");
  test.skip(!(await isPreview(page)), "checkout preview only");
  await expect(page.getByRole("radio", { name: /Ultimate Edition/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Xbox Series X|S" })).toBeChecked();
  await expect(page.locator("[data-delivery-note]")).toContainText("download the complete game");
  const methods = page.getByRole("radiogroup", { name: "Payment method" }).locator("[data-method]");
  // The starting methods (src/brand/payments.ts) in display order; other coins only if enabled in Admin → Wallets.
  const offered = await methods.evaluateAll((els) => els.map((e) => e.getAttribute("data-method")!));
  expect(offered.filter((m) => ["USDT:bsc", "USDT:tron", "BTC:bitcoin", "ETH:ethereum", "BNB:bsc"].includes(m))).toEqual(["USDT:bsc", "USDT:tron", "BTC:bitcoin", "ETH:ethereum", "BNB:bsc"]);
  for (const gone of ["USDC", "SOL", "POL", "Polygon", "Solana"]) await expect(page.locator("main")).not.toContainText(gone);
  // A required choice is missing: no order is created.
  await page.getByLabel("Email for your order").fill("buyer@example.com");
  await pickRegion(page, "United States");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Choose how you want to pay");
});

test("payment page shows exact amount, network warning and copy actions; submission awaits manual review", async ({ page }) => {
  const id = await startCheckout(page, { method: "USDT:bsc" });
  await expect(page.locator("main")).toContainText("39.00");
  await expect(page.getByText(/Amount held for \d+:\d{2}/)).toBeVisible();
  await expect(page.getByText("Quote expired")).toHaveCount(0);
  await expect(page.locator("main")).toContainText("BNB Smart Chain (BEP20)");
  await expect(page.locator("[data-delivery-note]")).toContainText("Your download link arrives by email");
  await expect(page.getByRole("alert").filter({ hasText: "on another network" })).toBeVisible();
  for (const what of ["Exact amount", "Payment ID"]) await expect(page.getByRole("button", { name: new RegExp(`Copy ${what}`) })).toBeVisible();
  await expect(page.locator("main")).toContainText("NOT-A-REAL-ADDRESS");
  // A real, scannable QR (address-only for a token) and a sample-address warning.
  const qr = page.getByRole("img", { name: /QR code with the receiving address/ });
  await expect(qr).toBeVisible();
  expect(await qr.getAttribute("data-qr-value")).toContain("NOT-A-REAL-ADDRESS");
  await expect(page.locator("main")).toContainText("Test order. Do not send funds.");

  // Proof form: order facts are read-only and prefilled.
  await expect(page.locator("form", { hasText: "Submit your payment" })).toContainText("buyer@example.com");
  await expect(page.locator("form", { hasText: "Submit your payment" })).toContainText(id);
  await page.getByLabel(/Amount you sent/).fill("39.00");

  // Malformed TXID is rejected client-side.
  await page.getByLabel("Transaction hash (TXID)").fill("not-a-hash");
  await page.getByRole("button", { name: "Submit payment for verification" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "transaction hash" })).toBeVisible();

  await page.getByLabel("Transaction hash (TXID)").fill(txEvm());
  await page.getByLabel(/Message/).fill("Sent from my exchange account.");
  // The screenshot is required.
  await page.getByRole("button", { name: "Submit payment for verification" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Add a screenshot" })).toBeVisible();
  // Clicking the drop zone opens the file picker (as a buyer would), then the file is chosen there.
  const chooser = page.waitForEvent("filechooser");
  await page.locator("[data-shot-drop]").click();
  await (await chooser).setFiles({ name: "proof.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("img", { name: "Selected payment screenshot" })).toBeVisible();
  await page.getByRole("button", { name: "Submit payment for verification" }).click();
  await expect(page.getByRole("heading", { name: "Payment submitted successfully" })).toBeVisible();
  await expect(page.locator("[data-delivery-note]")).toContainText("we email you a private link to get your game");
  await expect(page.locator("main")).toContainText("39.00 USDT");
  await expect(page.locator("main")).toContainText("Estimated processing time");
  await expect(page.locator("main")).toContainText("Our target processing time is 30 minutes");
  await expect(page.locator("main")).toContainText(id);
  await expect(page.getByRole("button", { name: /Copy Payment ID/ })).toBeVisible();

  // Submitting is not confirmation.
  await page.getByRole("link", { name: "Track your order" }).click();
  await expect(page.locator("main")).toContainText("Payment submitted");
  await expect(page.locator("main")).toContainText("Not confirmed yet");
  await expect(page.locator("main")).not.toContainText("Your game is ready");
});

test("order status needs Payment ID and email", async ({ page }) => {
  const id = await startCheckout(page, { method: "BTC:bitcoin" });
  await page.goto("/order-status");
  await page.getByLabel("Payment ID").fill(id);
  await page.getByLabel("Email used for the order").fill("someone-else@example.com");
  await page.getByRole("button", { name: "Check order status" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("could not find");

  await page.getByLabel("Email used for the order").fill("buyer@example.com");
  await page.getByRole("button", { name: "Check order status" }).click();
  await expect(page.locator("main")).toContainText("Awaiting payment");
  await expect(page.locator("main")).not.toContainText("Redeem on");

  // Game access appears only after an administrator approves and releases (see admin.spec.ts).
});

test("mobile: checkout has no horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/checkout");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

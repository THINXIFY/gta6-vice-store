import { createHmac } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { rmSync, writeFileSync } from "node:fs";
import { readInbox } from "./mail";
import { FAIL_SWITCH } from "./mail-sink";

/**
 * Admin dashboard end to end. Serial, desktop project only, one signed-in session reused
 * (login is rate limited per email). Owner credentials come from playwright.config.ts.
 */

const OWNER = { email: "owner@vice.test", password: "test-owner-password-123" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const ip = () => `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin suite runs on the desktop project");

async function signIn(browser: Browser, creds = OWNER): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip() } });
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  return page;
}

let admin: Page;
test.beforeAll(async ({ browser }) => {
  admin = await signIn(browser);
});
test.afterAll(async () => admin?.context().close());

test("unauthenticated visitors are sent to sign-in; screenshots are private", async ({ page, request }) => {
  for (const path of ["/admin", "/admin/orders", "/admin/orders/VICE-00000000", "/admin/wallets", "/admin/pricing", "/admin/homepage", "/admin/content", "/admin/launch", "/admin/fulfillment", "/admin/settings"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/admin\/login$/);
  }
  await page.getByLabel("Email").fill(OWNER.email);
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Incorrect email or password");
  expect((await request.get("/admin/screenshots/00000000-0000-0000-0000-000000000000")).status()).toBe(404);
});

test("overview shows the key figures and the sidebar", async () => {
  await admin.goto("/admin");
  for (const label of ["To review", "Awaiting payment", "Verified revenue", "Codes in stock", "Needs attention", "Recent activity"]) await expect(admin.locator("main")).toContainText(label);
  for (const item of ["Overview", "Orders & Payments", "Wallets", "Catalogue", "Homepage", "Content", "Game Fulfillment", "Settings"]) await expect(admin.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: item })).toBeVisible();
});

test("review flow: search, inspect, checklist approval, release, customer receives the code", async ({ request, browser }) => {
  const h = { "x-forwarded-for": ip() };
  const created = await request.post("/api/orders", { headers: h, data: { edition: "ultimate", platform: "ps5", email: "flow@example.com", region: "us", asset: "USDT", network: "tron" } });
  test.skip(created.status() === 409, "checkout is closed in live builds (no orders to review)");
  const { order, accessKey } = (await created.json()) as { order: { paymentId: string }; accessKey: string };
  const id = order.paymentId;
  const txid = hex(64);
  const submitted = await request.post("/api/orders/submit", {
    headers: h,
    multipart: { paymentId: id, email: "flow@example.com", txid, claimedAmount: "39.00", message: "Paid from Binance", key: accessKey, screenshot: { name: "p.png", mimeType: "image/png", buffer: PNG } },
  });
  expect(submitted.status()).toBe(200);

  // Search by TXID finds the order; CSV export (owner) includes it, formula-safe.
  await admin.goto(`/admin/orders?q=${txid}`);
  await expect(admin.getByRole("link", { name: id })).toBeVisible();
  const csv = await admin.request.get(`/admin/orders/export?q=${id}`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(csv.headers()["cache-control"]).toContain("no-store");
  const body = await csv.text();
  expect(body).toContain('"Payment ID","Reference"');
  expect(body).toContain(`"${id}"`);
  expect(body).toContain(`"${txid}"`);

  // Search and open.
  await admin.goto(`/admin/orders?q=${id}`);
  await admin.getByRole("link", { name: id }).click();
  await expect(admin.getByRole("heading", { level: 1, name: id })).toBeVisible();
  const main = admin.locator("main");
  for (const text of ["flow@example.com", "39.00 USDT", "Paid from Binance", "PREVIEW-TRON-USDT-NOT-A-REAL-ADDRESS"]) await expect(main).toContainText(text);
  const shot = admin.getByRole("img", { name: `Payment screenshot for ${id}` });
  await expect(shot).toBeVisible();
  expect(await shot.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // Approval requires the checklist and a sufficient on-chain amount.
  const approve = admin.locator("form", { hasText: "Approve payment" });
  for (const box of await approve.getByRole("checkbox").all()) await box.check();
  await approve.getByLabel(/Amount received on-chain/).fill("1.00");
  await approve.getByRole("button", { name: "Approve payment" }).click();
  await expect(admin.locator("main").getByRole("alert")).toContainText("below the expected");
  await expect(main).not.toContainText("Payment verified");

  const approve2 = admin.locator("form", { hasText: "Approve payment" });
  for (const box of await approve2.getByRole("checkbox").all()) await box.check();
  await approve2.getByLabel(/Amount received on-chain/).fill("39.00");
  await approve2.getByRole("button", { name: "Approve payment" }).click();
  await expect(admin.getByRole("status")).toContainText("Payment approved");
  await expect(main).toContainText("Payment verified");
  await expect(main).toContainText("by admin:owner@vice.test");

  // Customer: verified, but no game until release.
  let view = (await (await request.post("/api/orders/view", { headers: h, data: { paymentId: id, key: accessKey } })).json()) as { order: { status: string; fulfillment?: { code: string } } };
  expect(view.order.status).toBe("payment_verified");
  expect(view.order.fulfillment).toBeUndefined();

  // Add a test code, then release.
  const code = `TEST-${hex(4).toUpperCase()}-${hex(4).toUpperCase()}`;
  await admin.goto("/admin/fulfillment");
  const add = admin.locator("form", { hasText: "Add to inventory" });
  await add.getByLabel("Edition").selectOption("ultimate");
  await add.getByLabel("Platform").selectOption("ps5");
  await add.getByLabel("Code or link").fill(code);
  await add.getByLabel("Supplier or invoice reference").fill("Test supplier INV-001");
  await add.getByRole("button", { name: "Add to inventory" }).click();
  await expect(admin.getByRole("status")).toContainText("Item added");
  await expect(admin.locator("main")).not.toContainText(code); // only the hint is shown

  await admin.goto(`/admin/orders/${id}`);
  await admin.getByRole("button", { name: "Release game to customer" }).click();
  await expect(admin.getByRole("status")).toContainText("Game released");
  await expect(admin.locator("main")).toContainText("Game ready");

  view = (await (await request.post("/api/orders/view", { headers: h, data: { paymentId: id, key: accessKey } })).json()) as { order: { status: string; fulfillment?: { code: string } } };
  expect(view.order.status).toBe("game_ready");
  expect(view.order.fulfillment?.code).toBe(code);

  // Emails: one per event, delivered over SMTP (test mode redirects to the inbox), logged on the order.
  await admin.goto(`/admin/orders/${id}`);
  const emails = admin.locator("section", { has: admin.getByRole("heading", { name: "Emails", exact: true }) });
  for (const label of ["Order created", "Payment submitted", "Payment approved", "Game ready", "Admin alert: payment to review"]) await expect(emails).toContainText(label);
  await expect(emails).not.toContainText("failed");
  const mine = readInbox().filter((m) => m.subject.includes(id));
  expect(mine.map((m) => m.subject).sort()).toEqual(
    [`[Test] Complete your payment for order ${id}`, `[Test] Payment to review: ${id}`, `[Test] Payment verified for order ${id}`, `[Test] We received your payment details for ${id}`, `[Test] Your game is ready: order ${id}`].sort(),
  );
  expect(mine.every((m) => m.to === "inbox@vice.test" && m.html.includes("intended for"))).toBe(true);
  const ready = mine.find((m) => m.subject.includes("Your game is ready"))!;
  expect(ready.html).not.toContain(code); // never the code itself in an email
  expect(ready.text).not.toContain(code);
  const link = /href="([^"]+#key=[A-Za-z0-9_-]{43})"/.exec(ready.html)?.[1]?.replace(/&amp;/g, "&");
  expect(link).toBeTruthy();
  // The emailed link opens the order on a fresh device (time-limited release key).
  const fresh = await browser.newContext();
  const customer = await fresh.newPage();
  await customer.goto(new URL(link!).pathname + new URL(link!).search + new URL(link!).hash);
  await expect(customer.locator("main")).toContainText(code);
  await fresh.close();

  // Payment ID + email alone never reveals it.
  const lookup = (await (await request.post("/api/orders/status", { headers: h, data: { paymentId: id, email: "flow@example.com" } })).json()) as { order: Record<string, unknown> };
  expect(lookup.order).not.toHaveProperty("fulfillment");
});

test("wallets refuse invalid addresses and anything that looks like a secret", async () => {
  await admin.goto("/admin/wallets");
  const row = admin.locator("form").filter({ has: admin.getByLabel("USDT Tron (TRC20) receiving address") });
  await row.getByLabel("USDT Tron (TRC20) receiving address").fill("not-an-address");
  await row.getByLabel("Live").check();
  await row.getByRole("button", { name: "Save" }).click();
  await expect(admin.locator("main").getByRole("alert")).toContainText("not a valid Tron address");

  const row2 = admin.locator("form").filter({ has: admin.getByLabel("USDT Tron (TRC20) receiving address") });
  await row2.getByLabel("USDT Tron (TRC20) receiving address").fill(Array(12).fill("word").join(" "));
  await row2.getByRole("button", { name: "Save" }).click();
  await expect(admin.locator("main").getByRole("alert")).toContainText("private key or recovery phrase");

  // A one-character typo fails the TRON checksum even though the format looks right.
  const row3 = admin.locator("form").filter({ has: admin.getByLabel("USDT Tron (TRC20) receiving address") });
  await row3.getByLabel("USDT Tron (TRC20) receiving address").fill("TGrtArvSNS6SP3ZRyAERJ4FbXR8QqQGXiK");
  await row3.getByLabel("Live").check();
  await row3.getByRole("button", { name: "Save" }).click();
  await expect(admin.locator("main").getByRole("alert")).toContainText("not a valid Tron address");

  // Methods are added from the supported list (as test methods) and switched off again.
  await admin.goto("/admin/wallets");
  await admin.getByLabel("Coin and network").selectOption("LTC:litecoin");
  await admin.getByRole("button", { name: "Add method" }).click();
  await expect(admin.getByRole("status")).toContainText("Payment method added");
  const ltc = admin.locator("[data-wallet=\"LTC:litecoin\"]");
  await expect(ltc).toContainText("Test only");
  await ltc.getByLabel("Enabled").uncheck();
  await ltc.getByRole("button", { name: "Save" }).click();
  await expect(admin.getByRole("status")).toContainText("Wallet saved");
  await expect(admin.locator("[data-wallet=\"LTC:litecoin\"]")).toContainText("Switched off");
});

test("price changes reach the storefront immediately", async () => {
  const setPrice = async (dollars: string) => {
    await admin.goto("/admin/pricing");
    const cell = admin.locator("form").filter({ has: admin.getByLabel("Standard Edition price on Xbox Series X|S") });
    await cell.getByLabel("Standard Edition price on Xbox Series X|S").fill(dollars);
    await cell.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByRole("status")).toContainText("Price saved");
  };
  await setPrice("21.00");
  const shop = await admin.context().newPage();
  await shop.goto("/");
  await shop.locator("#editions label", { hasText: "Xbox Series X|S" }).click();
  await expect(shop.locator("#editions label", { hasText: "Standard Edition" })).toContainText("$21.00");
  await shop.close();
  await setPrice("19.00");
});

test("catalogue: editions, platforms and contents are managed in admin", async () => {
  await admin.goto("/admin/pricing");
  const main = admin.locator("main");
  await expect(main.getByRole("heading", { name: "Catalogue", level: 1 })).toBeVisible();
  // The seeded catalogue is listed (from the database, not code).
  for (const t of ["Standard Edition", "Ultimate Edition", "PlayStation 5", "Xbox Series X|S"]) await expect(main).toContainText(t);
  const itemInput = (v: string) => main.locator(`input[name="name"][value="${v}"]`);
  await expect(itemInput("Rideout Customs Mod Shop")).toHaveCount(1);

  // Add an edition that is not on sale yet: listed in admin, absent from the storefront.
  const name = `QA ${hex(4)} Edition`;
  await main.getByText("Add an edition").click();
  const add = main.locator("form", { has: admin.getByRole("button", { name: "Add edition" }) });
  await add.getByLabel("Name").fill(name);
  await add.getByLabel("Short line (pickers)").fill("Game + test extras");
  await add.getByLabel("On sale").uncheck();
  await add.getByRole("button", { name: "Add edition" }).click();
  await expect(admin.getByRole("status")).toContainText("Edition added");
  await expect(main).toContainText(name);
  const shop = await admin.context().newPage();
  await shop.goto("/");
  await expect(shop.locator("#editions")).toContainText("Standard Edition");
  await expect(shop.locator("#editions")).not.toContainText(name);
  await shop.close();

  // Redeem links must be https.
  await main.getByText("Add a platform").click();
  const plat = main.locator("form", { has: admin.getByRole("button", { name: "Add platform" }) });
  await plat.getByLabel("Name", { exact: true }).fill("QA Console");
  await plat.getByLabel("Redeem link (https)").fill("http://insecure.example");
  await plat.getByRole("button", { name: "Add platform" }).click();
  await expect(main.getByRole("alert")).toContainText("must start with https://");

  // Edition contents: add an item, then remove it.
  const item = `QA item ${hex(4)}`;
  const newItem = main.locator("form", { has: admin.getByRole("button", { name: "Add", exact: true }) });
  await newItem.getByLabel("New item category").fill("QA");
  await newItem.getByLabel("New item", { exact: true }).fill(item);
  await newItem.getByRole("button", { name: "Add", exact: true }).click();
  await expect(admin.getByRole("status")).toContainText("Item added");
  await expect(itemInput(item)).toHaveCount(1);
  await main.getByRole("button", { name: `Remove ${item}` }).click();
  await expect(admin.getByRole("status")).toContainText("Item removed");
  await expect(itemInput(item)).toHaveCount(0);
});

test("homepage: sections and menu are managed in admin", async () => {
  await admin.goto("/admin/homepage");
  const main = admin.locator("main");
  await expect(main.getByRole("heading", { name: "Homepage", level: 1 })).toBeVisible();
  await expect(main.locator("[data-block]")).toHaveCount(10);
  await expect(main.locator('[data-block="hero"]')).toContainText("Always on");

  const closing = main.locator('[data-block="closing"]');
  // Menu labels stay short.
  await closing.getByLabel("Closing call to action menu label").fill("A very long menu label here");
  await closing.getByRole("button", { name: "Save" }).click();
  await expect(main.getByRole("alert")).toContainText("24 characters or fewer");

  // A label puts the section in the site menu; clearing it takes it out again.
  await main.locator('[data-block="closing"]').getByLabel("Closing call to action menu label").fill("Get it");
  await main.locator('[data-block="closing"]').getByRole("button", { name: "Save" }).click();
  await expect(admin.getByRole("status")).toContainText("Homepage saved");
  await expect(main.getByRole("list", { name: "Menu preview" })).toContainText("Get it");
  const shop = await admin.context().newPage();
  await shop.goto("/");
  const nav = shop.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Get it" })).toHaveAttribute("href", "#closing");
  await expect(shop.locator("#closing")).toHaveCount(1);
  await main.locator('[data-block="closing"]').getByLabel("Closing call to action menu label").fill("");
  await main.locator('[data-block="closing"]').getByRole("button", { name: "Save" }).click();
  await expect(admin.getByRole("status")).toContainText("Homepage saved");
  await shop.reload();
  await expect(nav.getByRole("link", { name: "Get it" })).toHaveCount(0);
  await shop.close();
});

test("content: wording, FAQ and pages are managed in admin", async () => {
  const main = admin.locator("main");

  // Section text: a change reaches the storefront; resetting restores the default.
  await admin.goto("/admin/content?tab=text");
  await expect(main.getByRole("heading", { name: "Content", level: 1 })).toBeVisible();
  const closing = main.locator("#copy-closing");
  await closing.locator("summary").click();
  const body = `Choose, pay and play. ${hex(4)}`;
  await closing.getByLabel("Body").fill(body);
  await closing.getByRole("button", { name: /^Save closing/ }).click();
  await expect(admin.getByRole("status")).toContainText("Wording saved");
  const shop = await admin.context().newPage();
  await shop.goto("/");
  await expect(shop.locator("[data-closing-cta]")).toContainText(body);
  await main.locator("#copy-closing").getByRole("button", { name: "Reset this section" }).click();
  await expect(admin.getByRole("status")).toContainText("reset to the default");
  await shop.reload();
  await expect(shop.locator("[data-closing-cta]")).toContainText("Pick your platform and edition");

  // FAQ: add a question, then remove it.
  await admin.goto("/admin/content?tab=faq");
  const question = `QA question ${hex(4)}?`;
  await main.getByText("Add a question").click();
  const add = main.locator("form", { has: admin.getByRole("button", { name: "Add question" }) });
  await add.getByLabel("Question").fill(question);
  await add.getByLabel("Answer (lead with the direct answer)").fill("Yes. This is a test answer.");
  await add.getByRole("button", { name: "Add question" }).click();
  await expect(admin.getByRole("status")).toContainText("Question added");
  const row = main.locator("[data-faq]", { hasText: question });
  await expect(row).toContainText("Draft");
  await row.locator("summary").click();
  await row.getByRole("button", { name: "Remove question" }).click();
  await expect(admin.getByRole("status")).toContainText("Question removed");
  await expect(main.locator("[data-faq]", { hasText: question })).toHaveCount(0);

  // Pages: a page with "To confirm" items cannot be published; saving unchanged text keeps every section.
  await admin.goto("/admin/content?tab=pages&at=terms");
  const terms = main.locator("#page-terms");
  await expect(terms).toContainText("to confirm");
  await expect(terms.getByRole("button", { name: "Publish page" })).toBeDisabled();
  await shop.goto("/terms");
  const sectionsBefore = await shop.locator("main section[id]").count();
  const textBefore = await shop.locator("main article, main").first().innerText();
  await terms.getByRole("button", { name: "Save page" }).click();
  await expect(admin.getByRole("status")).toContainText("Page saved");
  await shop.reload();
  await expect(shop.locator("main section[id]")).toHaveCount(sectionsBefore);
  expect(await shop.locator("main article, main").first().innerText()).toBe(textBefore);
  await shop.close();
});

test("launch checklist and health check report this deployment honestly", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ ok: true });
  expect(health.headers()["cache-control"]).toContain("no-store");

  await admin.goto("/admin/launch");
  const main = admin.locator("main");
  await expect(main.getByRole("heading", { name: "Launch checklist", level: 1 })).toBeVisible();
  // The test build is a local preview: checkout closed, preview on, embedded database, no domain.
  for (const id of ["checkout", "preview", "database", "domain", "legal"]) await expect(main.locator(`[data-check="${id}"]`)).toHaveAttribute("data-ok", "false");
  await expect(main.locator(`[data-check="catalogue"]`)).toHaveAttribute("data-ok", "true");
  await expect(main.getByRole("progressbar")).toBeVisible();
  await expect(main).not.toContainText("test-owner-password-123");
});

test("reviewers cannot open owner pages", async ({ browser }) => {
  const email = `reviewer-${hex(6)}@vice.test`;
  await admin.goto("/admin/settings");
  const form = admin.locator("form", { hasText: "Add admin" });
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Role").selectOption("reviewer");
  await form.getByLabel("Temporary password").fill("reviewer-password-123");
  await form.getByRole("button", { name: "Add admin" }).click();
  await expect(admin.getByRole("status")).toContainText("Admin created");

  const reviewer = await signIn(browser, { email, password: "reviewer-password-123" });
  await expect(reviewer.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Wallets" })).toHaveCount(0);
  await reviewer.goto("/admin/wallets");
  await expect(reviewer).toHaveURL(/\/admin\?denied=1$/);
  await expect(reviewer.locator("main").getByRole("alert")).toContainText("owner role");
  // Exports and test emails are owner-only.
  expect((await reviewer.request.get("/admin/orders/export")).status()).toBe(403);
  await reviewer.goto("/admin/emails");
  await expect(reviewer.getByRole("button", { name: "Send test email" })).toHaveCount(0);
  await reviewer.context().close();
});

test("pages carry a nonce-based Content Security Policy", async ({ request, page }) => {
  const res = await request.get("/");
  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && /Content Security Policy/i.test(m.text()) && errors.push(m.text()));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

/** RFC 6238 code for a base32 secret (test-side implementation, independent of the app's). */
function totp(secret: string, offsetSteps = 0): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/\s+/g, "")) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const mac = createHmac("sha1", key).update(counter).digest();
  const o = mac[19]! & 15;
  return String((mac.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

test("two-factor: enrollment, code required at sign-in, wrong and replayed codes refused", async ({ browser }) => {
  const email = `twofactor-${hex(6)}@vice.test`;
  const password = "two-factor-password-123";
  await admin.goto("/admin/settings");
  const form = admin.locator("form", { hasText: "Add admin" });
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Temporary password").fill(password);
  await form.getByRole("button", { name: "Add admin" }).click();
  await expect(admin.getByRole("status")).toContainText("Admin created");

  const page = await signIn(browser, { email, password });
  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Set up two-factor" }).click();
  await expect(page.getByRole("img", { name: /authenticator app/ })).toBeVisible();
  const secret = (await page.locator("[data-totp-secret]").textContent())!.replace(/\s+/g, "");
  expect(await page.getByRole("img", { name: /authenticator app/ }).getAttribute("data-qr-value")).toContain(`secret=${secret}`);
  await page.getByLabel("Code from the app").fill("000000");
  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("not valid");
  const enrollCode = totp(secret);
  await page.getByLabel("Code from the app").fill(enrollCode);
  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByRole("status")).toContainText("Two-factor authentication is on");
  await page.context().close();

  // Sign-in now asks for a code; the enrollment code cannot be replayed.
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip() } });
  const p = await context.newPage();
  await p.goto("/admin/login");
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Password").fill(password);
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(p.getByLabel("Authentication code")).toBeVisible();
  await expect(p).toHaveURL(/\/admin\/login$/);
  await p.getByLabel("Authentication code").fill(enrollCode);
  await p.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(p.locator("form").getByRole("alert")).toContainText("not valid");
  await p.getByLabel("Authentication code").fill(totp(secret, 1));
  await p.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(p).toHaveURL(/\/admin$/);
  await context.close();

  // An owner can reset a lost authenticator.
  await admin.goto("/admin/settings");
  const row = admin.locator("li", { hasText: email });
  await expect(row).toContainText("Two-factor on");
  await row.getByRole("button", { name: "Reset two-factor" }).click();
  await expect(admin.getByRole("status")).toContainText("reset");
  await expect(admin.locator("li", { hasText: email })).toContainText("Two-factor off");
});

test("settings show the screenshot retention policy", async () => {
  await admin.goto("/admin/settings");
  const card = admin.locator("section", { hasText: "Payment screenshot retention" });
  await expect(card).toContainText("90 days");
  await expect(card.getByRole("button", { name: /Delete 0 due screenshots/ })).toBeDisabled();
});

test("emails: settings page, test email delivered over SMTP, template previews are admin-only", async ({ request }) => {
  await admin.goto("/admin/emails");
  await expect(admin.locator("main")).toContainText("every email is redirected to inbox@vice.test");
  await admin.getByLabel("Send to").fill("owner@vice.test");
  await admin.getByRole("button", { name: "Send test email" }).click();
  await expect(admin.getByRole("status")).toContainText("Test email sent to owner@vice.test");
  expect(readInbox().some((m) => m.subject === "[Test] Test email from VICE STORE admin")).toBe(true);
  await expect(admin.locator("section", { hasText: "Delivery log" })).toContainText("Test email");

  // Sender settings (Admin → Emails): name and reply-to reach real emails; addresses are validated.
  await admin.getByLabel(/Admin alert recipients/).fill("owner@vice.test, not-an-email");
  await admin.getByRole("button", { name: "Save sender settings" }).click();
  await expect(admin.locator("main").getByRole("alert")).toContainText("not a valid email address");
  await admin.getByLabel(/Admin alert recipients/).fill("");
  await admin.getByLabel("Sender name").fill("QA Sender");
  await admin.getByLabel("Reply-to address").fill("help@vice.test");
  await admin.getByRole("button", { name: "Save sender settings" }).click();
  await expect(admin.getByRole("status")).toContainText("Sender settings saved");
  await admin.getByLabel("Send to").fill("owner@vice.test");
  await admin.getByRole("button", { name: "Send test email" }).click();
  await expect(admin.getByRole("status")).toContainText("Test email sent");
  const latest = readInbox().filter((m) => m.subject === "[Test] Test email from VICE STORE admin").at(-1)!;
  expect(latest.headers).toMatch(/^From: "QA Sender" <[^>]+>/m);
  expect(latest.headers).toMatch(/^Reply-To: help@vice.test/m);
  await admin.getByLabel("Sender name").fill("");
  await admin.getByLabel("Reply-to address").fill("");
  await admin.getByRole("button", { name: "Save sender settings" }).click();
  await expect(admin.getByRole("status")).toContainText("Sender settings saved");

  const preview = await admin.request.get("/admin/emails/preview/payment_rejected");
  expect(preview.status()).toBe(200);
  expect(preview.headers()["content-security-policy"]).toContain("default-src 'none'");
  expect(await preview.text()).toContain("We could not verify your payment");
  expect((await request.get("/admin/emails/preview/payment_rejected")).status()).toBe(404); // signed out
  expect((await request.get("/admin/orders/export")).status()).toBe(404);
});

test("overview keeps live and test figures apart; orders list sorts, filters and paginates", async () => {
  await admin.goto("/admin?data=live");
  await expect(admin.getByRole("navigation", { name: "Data set" }).getByRole("link", { name: /Live/ })).toHaveAttribute("aria-current", "page");
  await expect(admin.locator("main")).toContainText("Live orders and verified revenue");
  await admin.goto("/admin?data=test");
  await expect(admin.locator("main")).toContainText("Codes in stock");
  await admin.goto("/admin/orders?dataset=live&sort=newest");
  await expect(admin.locator("main")).toContainText("No orders match these filters");
  await admin.goto("/admin/orders?dataset=test&sort=amount");
  // Live builds have no orders at all (checkout closed): then the empty state shows instead.
  if (await admin.getByText("No orders match these filters").count()) await expect(admin.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
  else await expect(admin.getByRole("navigation", { name: "Pagination" })).toContainText(/1–\d+ of \d+/);
});

test("failed emails can be retried by an owner; support messages can be resolved", async ({ request }) => {
  // Make the inbox reject mail, send a test email (fails), then retry once delivery works.
  writeFileSync(FAIL_SWITCH, "1");
  try {
    await admin.goto("/admin/emails");
    await admin.getByLabel("Send to").fill("retry@vice.test");
    await admin.getByRole("button", { name: "Send test email" }).click();
    await expect(admin.locator("main").getByRole("alert")).toContainText("could not be sent");
  } finally {
    rmSync(FAIL_SWITCH, { force: true });
  }
  const row = admin.locator("tr", { hasText: "retry@vice.test" }).first();
  await expect(row).toContainText("failed");
  await row.getByRole("button", { name: "Retry" }).click();
  await expect(admin.getByRole("status")).toContainText("Email sent.");
  await expect(admin.locator("tr", { hasText: "retry@vice.test" }).first()).toContainText("2 attempts");

  // Support: a contact-form message appears in Admin → Support and can be resolved and reopened.
  const sent = await request.post("/api/support", { headers: { "x-forwarded-for": ip() }, data: { email: "help@example.com", topic: "delivery", message: "Where is my game? I paid yesterday." } });
  test.skip(sent.status() === 409, "contact form is unpublished in live builds");
  const { reference } = (await sent.json()) as { reference: string };
  await admin.goto("/admin/support");
  const item = admin.locator("li", { hasText: reference });
  await expect(item).toContainText("Where is my game?");
  await expect(item).toContainText("Game delivery");
  await item.getByRole("button", { name: "Mark resolved" }).click();
  await expect(admin.getByRole("status")).toContainText("Marked as resolved");
  await admin.goto("/admin/support?view=resolved");
  await admin.locator("li", { hasText: reference }).getByRole("button", { name: "Reopen" }).click();
  await expect(admin.getByRole("status")).toContainText("Reopened");
  expect(readInbox().some((m) => m.subject.includes(reference) && m.subject.includes("We received your message"))).toBe(true);
  expect(readInbox().some((m) => m.subject.includes(`Support message ${reference}`))).toBe(true);
});

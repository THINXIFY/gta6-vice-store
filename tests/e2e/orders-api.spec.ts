import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Order API security. Each test uses its own X-Forwarded-For (server runs with TRUST_PROXY=1)
 * so rate limits are isolated per test.
 */

let ipSeq = 0;
const client = () => ({ "x-forwarded-for": `10.9.${process.pid % 250}.${++ipSeq % 250}` });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

type OrderRes = { order: Record<string, unknown> & { paymentId: string; status: string; claimedAmount?: string; quote: { usdCents: number; amount: string }; authorized: boolean }; accessKey: string };

async function create(request: APIRequestContext, headers: Record<string, string>, extra: Record<string, unknown> = {}) {
  return request.post("/api/orders", {
    headers,
    data: { edition: "ultimate", platform: "ps5", email: "Buyer@Example.com", region: "us", asset: "USDT", network: "tron", ...extra },
  });
}

test.beforeEach(async ({ request }) => {
  const res = await create(request, client());
  test.skip(res.status() === 409, "checkout is closed in live builds");
});

test("server decides price, amount and Payment ID; browser-supplied money is ignored", async ({ request }) => {
  const res = await create(request, client(), { usdCents: 1, amount: "0.01", price: 1, paymentId: "VICE-AAAAAAAA" });
  expect(res.status()).toBe(200);
  const { order, accessKey } = (await res.json()) as OrderRes;
  expect(order.quote.usdCents).toBe(3900);
  expect(order.quote.amount).toBe("39.00");
  expect(order.paymentId).toMatch(/^VICE-[0-9A-HJKMNP-TV-Z]{8}$/);
  expect(order.paymentId).not.toBe("VICE-AAAAAAAA");
  expect(accessKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(order).not.toHaveProperty("id");
  expect(order.test).toBe(true);
});

test("input validation rejects unknown products, methods and bad emails", async ({ request }) => {
  const h = client();
  expect((await create(request, h, { edition: "deluxe" })).status()).toBe(400);
  expect((await create(request, h, { asset: "DOGE" })).status()).toBe(400);
  expect((await create(request, h, { asset: "BTC", network: "tron" })).status()).toBe(400);
  // Retired methods (rows may remain in the table) are refused: only the five configured pairs.
  expect((await create(request, h, { asset: "USDT", network: "polygon" })).status()).toBe(400);
  expect((await create(request, h, { asset: "USDC", network: "ethereum" })).status()).toBe(400);
  expect((await create(request, h, { email: "not-an-email" })).status()).toBe(400);
  const bad = await request.post("/api/orders", { headers: { ...h, "content-type": "application/json" }, data: "{not json" });
  expect(bad.status()).toBe(400);
});

test("full order view requires the access key", async ({ request }) => {
  const h = client();
  const { order, accessKey } = (await (await create(request, h)).json()) as OrderRes;
  expect((await request.post("/api/orders/view", { headers: h, data: { paymentId: order.paymentId } })).status()).toBe(404);
  expect((await request.post("/api/orders/view", { headers: h, data: { paymentId: order.paymentId, key: "x".repeat(43) } })).status()).toBe(404);
  const ok = await request.post("/api/orders/view", { headers: h, data: { paymentId: order.paymentId, key: accessKey } });
  expect(ok.status()).toBe(200);
  expect(((await ok.json()) as OrderRes).order.address).toBeTruthy();
});

test("Payment ID + email shows progress only, never address, TXID or fulfillment", async ({ request }) => {
  const h = client();
  const { order } = (await (await create(request, h)).json()) as OrderRes;
  const wrong = await request.post("/api/orders/status", { headers: h, data: { paymentId: order.paymentId, email: "other@example.com" } });
  expect(wrong.status()).toBe(404);
  const res = await request.post("/api/orders/status", { headers: h, data: { paymentId: order.paymentId, email: "buyer@example.com" } });
  const body = ((await res.json()) as OrderRes).order;
  expect(body.authorized).toBe(false);
  for (const field of ["address", "txid", "email", "fulfillment"]) expect(body).not.toHaveProperty(field);
});

test("TXID: format validated, duplicates rejected, submission never confirms", async ({ request }) => {
  const h = client();
  const a = ((await (await create(request, h)).json()) as OrderRes).order;
  const b = ((await (await create(request, h)).json()) as OrderRes).order;
  const shot = { name: "p.png", mimeType: "image/png", buffer: PNG };
  const submit = (paymentId: string, txid: string) => request.post("/api/orders/submit", { headers: h, multipart: { paymentId, email: "buyer@example.com", txid, claimedAmount: "39.00", screenshot: shot } });

  expect((await submit(a.paymentId, "0x" + hex(64))).status()).toBe(400); // EVM hash on a Tron order
  const txid = hex(64);
  const ok = await submit(a.paymentId, txid);
  expect(ok.status()).toBe(200);
  expect(((await ok.json()) as OrderRes).order.status).toBe("payment_submitted");
  expect((await submit(b.paymentId, txid.toUpperCase())).status()).toBe(409); // same TXID, other order
  expect((await submit(a.paymentId, hex(64))).status()).toBe(409); // already submitted
});

test("payment proof: amount and screenshot content are validated server-side", async ({ request }) => {
  const h = client();
  const { order, accessKey } = (await (await create(request, h)).json()) as OrderRes;
  const base = { paymentId: order.paymentId, email: "buyer@example.com", txid: hex(64), key: accessKey };
  const send = (multipart: Record<string, unknown>) => request.post("/api/orders/submit", { headers: h, multipart: { ...base, ...multipart } as never });

  expect((await send({ claimedAmount: "abc" })).status()).toBe(400);
  // Screenshot is mandatory.
  const missing = await send({ claimedAmount: "39.00" });
  expect(missing.status()).toBe(400);
  expect(((await missing.json()) as { error: string }).error).toMatch(/screenshot/);
  // A text file renamed .png with an image MIME type is rejected by content sniffing.
  const fake = await send({ claimedAmount: "39.00", screenshot: { name: "proof.png", mimeType: "image/png", buffer: Buffer.from("not really an image") } });
  expect(fake.status()).toBe(400);
  expect(((await fake.json()) as { error: string }).error).toMatch(/PNG, JPG or WebP/);
  const big = await send({ claimedAmount: "39.00", screenshot: { name: "big.png", mimeType: "image/png", buffer: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]) } });
  expect([400, 413]).toContain(big.status());

  const ok = await send({ claimedAmount: "39.00", message: "Thanks", screenshot: { name: "proof.png", mimeType: "image/png", buffer: PNG } });
  expect(ok.status()).toBe(200);
  const body = ((await ok.json()) as OrderRes).order;
  expect(body.status).toBe("payment_submitted");
  expect(body.claimedAmount).toBe("39.00");
});

test("removed test-mode admin endpoint stays gone", async ({ request }) => {
  expect((await request.post("/api/test/orders/status", { headers: client(), data: {} })).status()).toBe(404);
});

test("rate limiting returns 429 with Retry-After", async ({ request }) => {
  const h = client();
  let last = 200;
  let retry: string | undefined;
  for (let i = 0; i < 25 && last !== 429; i++) {
    const r = await request.post("/api/orders/status", { headers: h, data: { paymentId: "VICE-00000000", email: "a@b.co" } });
    last = r.status();
    retry = r.headers()["retry-after"];
  }
  expect(last).toBe(429);
  expect(Number(retry)).toBeGreaterThan(0);
});

test("cross-origin POSTs are refused", async ({ request }) => {
  const res = await request.post("/api/orders/status", { headers: { ...client(), origin: "https://evil.example" }, data: {} });
  expect(res.status()).toBe(403);
});

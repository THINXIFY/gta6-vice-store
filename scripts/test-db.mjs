/**
 * Migration + constraint tests on a fresh in-memory Postgres (PGlite).
 * Verifies: migrations apply cleanly and are idempotent; keys, checks and triggers hold.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const migrationsFolder = path.join(process.cwd(), "drizzle");
const db = new PGlite();
const orm = drizzle(db);
const q = (sql, params) => db.query(sql, params);
const rejects = async (sql, params, pattern) => {
  await assert.rejects(q(sql, params), (err) => {
    assert.match(String(err.message), pattern);
    return true;
  });
};

const HASH = "a".repeat(64);
const order = (paymentId, ref) => [
  `insert into orders (payment_id, reference, email, region, edition_id, platform_id, usd_cents, asset, network, crypto_amount, rate, rate_is_preview, address, quote_expires_at, access_key_hash, is_test)
   values ($1, $2, 'a@b.co', 'us', 'standard', 'ps5', 1900, 'USDT', 'tron', '19.00', '1', true, 'X', now() + interval '30 min', $3, true) returning id`,
  [paymentId, ref, HASH],
];

test("migrations apply and are idempotent", async () => {
  await migrate(orm, { migrationsFolder });
  await migrate(orm, { migrationsFolder });
  const { rows } = await q(`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
  assert.equal(rows[0].n, 16); // + email_messages (GTA-09D), support_messages (GTA-11A)
});

test("catalogue constraints", async () => {
  await q(`insert into products (id, title) values ('gta-vi', 'Grand Theft Auto VI')`);
  await q(`insert into editions (id, product_id, name) values ('standard', 'gta-vi', 'Standard Edition')`);
  await q(`insert into platforms (id, name) values ('ps5', 'PlayStation 5')`);
  await rejects(`insert into prices (edition_id, platform_id, amount_cents) values ('standard', 'ps5', 0)`, [], /prices_amount_positive/);
  await q(`insert into prices (edition_id, platform_id, amount_cents) values ('standard', 'ps5', 1900)`);
  await rejects(`insert into prices (edition_id, platform_id, amount_cents) values ('standard', 'ps5', 2000)`, [], /duplicate key/);
  await rejects(`insert into prices (edition_id, platform_id, amount_cents) values ('nope', 'ps5', 100)`, [], /foreign key/);
});

test("orders: unique, well-formed and immutable Payment IDs", async () => {
  const { rows } = await q(...order("VICE-7KQ2M9XA", "ORD-AAAAAA"));
  await rejects(...order("VICE-7KQ2M9XA", "ORD-BBBBBB"), /orders_payment_id_key/);
  await rejects(...order("VICE-lowercase", "ORD-CCCCCC"), /orders_payment_id_format/);
  await rejects(`update orders set payment_id = 'VICE-00000000' where id = $1`, [rows[0].id], /immutable/);
  await rejects(`update orders set usd_cents = 1 where id = $1`, [rows[0].id], /immutable/);
  await q(`update orders set status = 'payment_submitted' where id = $1`, [rows[0].id]); // mutable status
  await rejects(`delete from orders where id = $1`, [rows[0].id], /append-only/);
});

test("duplicate TXIDs are rejected per network (case-insensitive key)", async () => {
  const a = (await q(...order("VICE-11111111", "ORD-111111"))).rows[0].id;
  const b = (await q(...order("VICE-22222222", "ORD-222222"))).rows[0].id;
  const ins = `insert into payment_submissions (order_id, network, txid, txid_normalized, email, claimed_amount) values ($1, 'tron', $2, lower($2), 'a@b.co', '19.00')`;
  await q(ins, [a, "ABCDEF"]);
  await rejects(ins, [b, "abcdef"], /payment_submissions_network_txid_key/);
});

test("history, audit and submissions are append-only", async () => {
  const id = (await q(...order("VICE-33333333", "ORD-333333"))).rows[0].id;
  await q(`insert into order_status_history (order_id, to_status, actor) values ($1, 'awaiting_payment', 'customer')`, [id]);
  await rejects(`update order_status_history set actor = 'x'`, [], /append-only/);
  await q(`insert into audit_logs (actor, action, entity, entity_id) values ('test', 'x', 'order', $1)`, [id]);
  await rejects(`delete from audit_logs`, [], /append-only/);
});

test("fulfillment: one code per order, assignment fields consistent", async () => {
  const id = (await q(...order("VICE-44444444", "ORD-444444"))).rows[0].id;
  const ins = `insert into fulfillment_inventory (edition_id, platform_id, secret_ciphertext, source_reference, assigned_order_id, assigned_at) values ('standard', 'ps5', 'enc', 'INV-1', $1, $2)`;
  await rejects(ins, [id, null], /fulfillment_assignment_consistent/);
  await q(ins, [id, new Date()]);
  await rejects(ins, [id, new Date()], /fulfillment_inventory_assigned_order_key/);
});

test("GTA-09B: screenshots constrained and immutable; submissions carry decimal amounts", async () => {
  const id = (await q(...order("VICE-55555555", "ORD-555555"))).rows[0].id;
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  await rejects(`insert into payment_screenshots (order_id, mime, bytes, sha256, data) values ($1, 'image/gif', 4, 'x', $2)`, [id, png], /payment_screenshots_mime/);
  await rejects(`insert into payment_screenshots (order_id, mime, bytes, sha256, data) values ($1, 'image/png', 6000000, 'x', $2)`, [id, png], /payment_screenshots_size/);
  const shot = (await q(`insert into payment_screenshots (order_id, mime, bytes, sha256, data) values ($1, 'image/png', 4, 'x', $2) returning id`, [id, png])).rows[0].id;
  await rejects(`update payment_screenshots set mime = 'image/jpeg' where id = $1`, [shot], /append-only/);
  // GTA-09C: the only allowed change is a one-time retention purge (bytes emptied, metadata kept); never delete.
  await rejects(`update payment_screenshots set data = $2 where id = $1`, [shot, Buffer.alloc(0)], /append-only/);
  await rejects(`update payment_screenshots set purged_at = now() where id = $1`, [shot], /append-only/);
  await rejects(`delete from payment_screenshots where id = $1`, [shot], /append-only/);
  await q(`update payment_screenshots set data = $2, purged_at = now() where id = $1`, [shot, Buffer.alloc(0)]);
  await rejects(`update payment_screenshots set data = $2, purged_at = now() where id = $1`, [shot, Buffer.alloc(0)], /append-only/);
  // GTA-09D: each email is logged once per dedupe key; the log cannot be deleted; release keys are hashes.
  const mail = "insert into email_messages (order_id, kind, dedupe_key, recipient, subject, test_mode) values ($1, 'order_created', $2, 'a@b.co', 's', true)";
  await q(mail, [id, `order_created:${id}`]);
  await rejects(mail, [id, `order_created:${id}`], /email_messages_dedupe_key/);
  const dup = await q(mail + " on conflict do nothing returning id", [id, `order_created:${id}`]);
  if (dup.rows.length) throw new Error("duplicate email row inserted");
  await rejects("delete from email_messages where order_id = $1", [id], /append-only/);
  // GTA-11A: support messages are validated and never deleted.
  const sup = "insert into support_messages (reference, email, topic, message, is_test, payment_id) values ($1, 'a@b.co', $2, $3, true, $4) returning id";
  const [{ id: supId }] = (await q(sup, ["SUP-AAAAAA", "payment", "Where is my payment?", null])).rows;
  await rejects(sup, ["SUP-AAAAAA", "payment", "Duplicate reference", null], /support_messages_reference_key/);
  await rejects(sup, ["SUP-BBBBBB", "spam", "Unknown topic here", null], /support_messages_topic/);
  await rejects(sup, ["SUP-CCCCCC", "other", "short", null], /support_messages_lengths/);
  await rejects(sup, ["SUP-DDDDDD", "order", "Bad payment id here", "VICE-1"], /support_messages_payment_id/);
  await rejects("update support_messages set status = 'deleted' where id = $1", [supId], /support_messages_status/);
  await rejects("delete from support_messages where id = $1", [supId], /append-only/);
  await rejects("update orders set release_key_hash = 'not-a-hash' where id = $1", [id], /orders_release_key_sha256/);
  await q("update orders set release_key_hash = $2, release_key_expires_at = now() + interval '30 days' where id = $1", [id, "a".repeat(64)]);
  await rejects(`insert into payment_submissions (order_id, network, txid, txid_normalized, email, claimed_amount) values ($1, 'tron', 'T1', 't1', 'a@b.co', '1e5')`, [id], /payment_submissions_claimed_decimal/);
  await q(`insert into payment_submissions (order_id, network, txid, txid_normalized, email, claimed_amount, screenshot_id) values ($1, 'tron', 'T2', 't2', 'a@b.co', '19.00', $2)`, [id, shot]);
  await rejects(`update orders set verified_amount = 'lots' where id = $1`, [id], /orders_verified_amount_decimal/);
  await q(`update orders set verified_amount = '19.00', admin_note = 'ok' where id = $1`, [id]);
});

test("GTA-09B: admin emails unique case-insensitively; sessions keyed by token hash", async () => {
  await q(`insert into admin_users (email, password_hash, role) values ('Owner@Example.com', 'h', 'owner')`);
  await rejects(`insert into admin_users (email, password_hash) values ('owner@example.com', 'h')`, [], /admin_users_email_key/);
  const admin = (await q(`select id from admin_users limit 1`)).rows[0].id;
  await q(`insert into admin_sessions (admin_id, token_hash, expires_at) values ($1, 'abc', now() + interval '1 hour')`, [admin]);
  await rejects(`insert into admin_sessions (admin_id, token_hash, expires_at) values ($1, 'abc', now())`, [admin], /admin_sessions_token_key/);
});

test("GTA-09B: shared rate-limit counter is atomic", async () => {
  const hit = () =>
    q(`insert into rate_limits (key, count, reset_at) values ('k', 1, now() + interval '1 min')
       on conflict (key) do update set count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end
       returning count`);
  const counts = [];
  for (let i = 0; i < 5; i++) counts.push((await hit()).rows[0].count);
  assert.deepEqual(counts, [1, 2, 3, 4, 5]);
});

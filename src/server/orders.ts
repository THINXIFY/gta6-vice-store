import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { assets, networks, quoteMinutes, txPatterns, type AssetId, type NetworkId } from "@/config/payments";
import { editions as editionConfig, platforms as platformConfig } from "@/config/product";
import type { EditionId, PlatformId } from "@/config/types";
import * as s from "@/db/schema";
import { checkoutAvailable, checkoutOpen } from "@/lib/checkout";
import { generatePaymentId, paymentIdPattern } from "@/lib/orders/id";
import { cryptoAmount, rateString } from "@/lib/orders/quote";
import { transitions, type Order, type OrderStatus } from "@/lib/orders/types";
import { getDb } from "./db";
import { notifyOrder } from "./email";
import { rateFor } from "./rates";
import { hashKey, InputError, keyMatches, newAccessKey } from "./security";
import { open } from "./vault";

type Row = typeof s.orders.$inferSelect;
type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

export class NotFound extends Error {}
export class Conflict extends Error {}

const REF_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const newReference = () => `ORD-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => REF_ALPHABET[b & 31]).join("")}`;

/** The order access key, or the time-limited key from the game-ready email. */
function authorized(key: string | undefined, row: Row): boolean {
  if (keyMatches(key, row.accessKeyHash)) return true;
  return Boolean(row.releaseKeyHash && row.releaseKeyExpiresAt && row.releaseKeyExpiresAt > new Date() && keyMatches(key, row.releaseKeyHash));
}

function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

async function recordTransition(tx: Tx, orderId: string, from: OrderStatus | null, to: OrderStatus, actor: string, ip?: string, note?: string) {
  await tx.insert(s.orderStatusHistory).values({ orderId, fromStatus: from, toStatus: to, actor, note });
  await tx.insert(s.auditLogs).values({ actor, action: `order.status.${to}`, entity: "order", entityId: orderId, data: { from, to, note: note ?? null }, ipHash: ip });
}

/** Moves an order only along allowed transitions, guarded by its current status (atomic). */
async function transition(tx: Tx, row: Row, to: OrderStatus, actor: string, opts: { ip?: string; note?: string; customerNote?: string | null } = {}) {
  if (!transitions[row.status].includes(to)) throw new Conflict(`Order cannot move from ${row.status} to ${to}.`);
  const updated = await tx
    .update(s.orders)
    .set({ status: to, ...(opts.customerNote !== undefined && { customerNote: opts.customerNote }) })
    .where(and(eq(s.orders.id, row.id), eq(s.orders.status, row.status)))
    .returning({ id: s.orders.id });
  if (!updated.length) throw new Conflict("The order changed while processing. Please try again.");
  await recordTransition(tx, row.id, row.status, to, actor, opts.ip, opts.note);
}

async function fulfillmentFor(orderId: string): Promise<{ fulfillment?: Order["fulfillment"] }> {
  const db = await getDb();
  const [item] = await db.select().from(s.fulfillmentInventory).where(eq(s.fulfillmentInventory.assignedOrderId, orderId));
  if (!item) return {};
  return { fulfillment: { kind: item.kind, code: open(item.secretCiphertext), test: item.isTest } };
}

export async function toPublic(row: Row, authorized: boolean): Promise<Order> {
  const db = await getDb();
  const [history, submission] = await Promise.all([
    db.select().from(s.orderStatusHistory).where(eq(s.orderStatusHistory.orderId, row.id)).orderBy(asc(s.orderStatusHistory.id)),
    db.select().from(s.paymentSubmissions).where(eq(s.paymentSubmissions.orderId, row.id)).orderBy(asc(s.paymentSubmissions.createdAt)),
  ]);
  const last = submission.at(-1);
  return {
    paymentId: row.paymentId,
    reference: row.reference,
    edition: row.editionId as EditionId,
    platform: row.platformId as PlatformId,
    quote: {
      asset: row.asset as AssetId,
      network: row.network as NetworkId,
      amount: row.cryptoAmount,
      usdCents: row.usdCents,
      rate: Number(row.rate),
      preview: row.rateIsPreview,
      expiresAt: row.quoteExpiresAt.toISOString(),
    },
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    submittedAt: last?.createdAt.toISOString(),
    customerNote: row.customerNote ?? undefined,
    history: history.map((h) => ({ status: h.toStatus, at: h.createdAt.toISOString() })),
    test: row.isTest,
    authorized,
    ...(authorized && {
      email: row.email,
      address: row.address,
      txid: last?.txid,
      claimedAmount: last?.claimedAmount,
      // Fulfillment only after approval, decrypted from the inventory item an admin assigned.
      ...(row.status === "game_ready" && (await fulfillmentFor(row.id))),
    }),
  };
}

/** Expires an unpaid order past its quote (system action). Never approves anything. */
async function expireIfDue(row: Row): Promise<Row> {
  if (row.status !== "awaiting_payment" || row.quoteExpiresAt.getTime() > Date.now()) return row;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(s.orders).where(eq(s.orders.id, row.id)).for("update");
    if (cur?.status === "awaiting_payment") await transition(tx, cur, "order_expired", "system", { note: "Quote window elapsed" });
  });
  const [fresh] = await db.select().from(s.orders).where(eq(s.orders.id, row.id));
  return fresh!;
}

async function findByPaymentId(paymentId: unknown): Promise<Row | null> {
  if (typeof paymentId !== "string") return null;
  const id = paymentId.trim().toUpperCase();
  if (!paymentIdPattern.test(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(s.orders).where(eq(s.orders.paymentId, id));
  return row ? expireIfDue(row) : null;
}

// ── Public operations ───────────────────────────────────────────────────────

export type CreateInput = { edition: EditionId; platform: PlatformId; email: string; region: string; asset: AssetId; network: NetworkId };

export async function createOrder(input: CreateInput, ip: string): Promise<{ order: Order; accessKey: string }> {
  if (!checkoutAvailable) throw new Conflict("Checkout is not open.");
  const db = await getDb();

  // Authoritative price and method from the database, never from the browser.
  const [price] = await db
    .select()
    .from(s.prices)
    .where(and(eq(s.prices.editionId, input.edition), eq(s.prices.platformId, input.platform), eq(s.prices.active, true)));
  if (!price) throw new InputError("This edition is not available on that platform.");
  const [method] = await db
    .select()
    .from(s.paymentMethods)
    .where(and(eq(s.paymentMethods.asset, input.asset), eq(s.paymentMethods.network, input.network), eq(s.paymentMethods.active, true)));
  const live = method && method.validated && !method.isTest && method.address;
  if (!method || (!live && !(method.isTest && !checkoutOpen))) throw new InputError("That payment method is not available.");

  // Live payments stay off until commerce.checkoutEnabled (legitimate inventory, rights, compliance).
  if (live && !checkoutOpen) throw new Conflict("Live payments are not enabled.");

  // Server-side quote: a fresh exchange rate, locked with the exact amount for quoteMinutes.
  const rate = await rateFor(input.asset);
  if (!rate || (live && rate.fixed)) throw new Conflict("Exchange rates are temporarily unavailable for this coin. Please try again in a minute or choose another.");
  const decimals = assets.find((a) => a.id === input.asset)!.decimals;
  const lockedRate = rateString(rate.usd);
  const quote = { amount: cryptoAmount(price.amountCents, lockedRate, decimals), rate: lockedRate, expiresAt: new Date(Date.now() + quoteMinutes * 60_000) };
  const accessKey = newAccessKey();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(s.orders)
          .values({
            paymentId: generatePaymentId(),
            reference: newReference(),
            email: input.email,
            region: input.region,
            editionId: input.edition,
            platformId: input.platform,
            usdCents: price.amountCents,
            asset: input.asset,
            network: input.network,
            cryptoAmount: quote.amount,
            rate: quote.rate,
            rateIsPreview: rate.fixed,
            rateSource: rate.source,
            address: method.address,
            quoteExpiresAt: quote.expiresAt,
            accessKeyHash: hashKey(accessKey),
            isTest: !live,
          })
          .returning();
        await recordTransition(tx, created!.id, null, "awaiting_payment", "customer", ip);
        return created!;
      });
      await notifyOrder(row.id, { kind: "order_created", accessKey });
      return { order: await toPublic(row, true), accessKey };
    } catch (err) {
      if (pgCode(err) === "23505") continue; // Payment ID / reference collision: retry with new ones.
      throw err;
    }
  }
  throw new Error("Could not allocate a unique Payment ID.");
}

/** Full order view: requires the access key. */
export async function viewOrder(paymentId: unknown, key: string | undefined): Promise<Order> {
  const row = await findByPaymentId(paymentId);
  if (!row || !authorized(key, row)) throw new NotFound("Order not found.");
  return toPublic(row, true);
}

/**
 * Status lookup. Payment ID + email returns progress only; sensitive details (address,
 * TXID, fulfillment) additionally require the access key.
 */
export async function lookupOrder(paymentId: unknown, email: string, key: string | undefined): Promise<Order> {
  const row = await findByPaymentId(paymentId);
  if (!row || row.email !== email) throw new NotFound("We could not find an order with that Payment ID and email.");
  return toPublic(row, authorized(key, row));
}

export type Proof = { txid: string; claimedAmount: string; message?: string; screenshot: { mime: string; data: Buffer } };

/** Customer proof of payment. Atomic: screenshot + submission + status change, or nothing. */
export async function submitPayment(paymentId: unknown, email: string, proof: Proof, key: string | undefined, ip: string): Promise<Order> {
  const found = await findByPaymentId(paymentId);
  if (!found || found.email !== email) throw new NotFound("We could not find an order with that Payment ID and email.");
  if (found.status === "order_expired") throw new Conflict("This order has expired. Start a new checkout to get a fresh quote.");
  const net = networks[found.network as NetworkId];
  if (!net || !txPatterns[net.family].test(proof.txid)) throw new InputError(`That does not look like a ${net?.name ?? ""} transaction hash.`);

  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(s.orders).where(eq(s.orders.id, found.id)).for("update");
      if (!row || !transitions[row.status].includes("payment_submitted")) throw new Conflict("This order is not waiting for a payment submission.");
      let screenshotId: string | undefined;
      if (proof.screenshot) {
        const [shot] = await tx
          .insert(s.paymentScreenshots)
          .values({ orderId: row.id, mime: proof.screenshot.mime, bytes: proof.screenshot.data.length, sha256: createHash("sha256").update(proof.screenshot.data).digest("hex"), data: proof.screenshot.data })
          .returning({ id: s.paymentScreenshots.id });
        screenshotId = shot!.id;
      }
      await tx.insert(s.paymentSubmissions).values({
        orderId: row.id,
        network: row.network,
        txid: proof.txid,
        txidNormalized: proof.txid.toLowerCase(),
        email,
        claimedAmount: proof.claimedAmount,
        message: proof.message || null,
        screenshotId,
      });
      await transition(tx, row, "payment_submitted", "customer", { ip, customerNote: null });
    });
  } catch (err) {
    if (pgCode(err) === "23505") throw new Conflict("This transaction hash has already been submitted.");
    throw err;
  }
  const [fresh] = await db.select().from(s.orders).where(eq(s.orders.id, found.id));
  await notifyOrder(found.id, { kind: "payment_submitted" });
  return toPublic(fresh!, authorized(key, fresh!));
}

/** Admin-side transition helper (used by src/server/admin.ts). */
export { transition as adminTransition, recordTransition, findByPaymentId };

export const catalogue = {
  editions: editionConfig.map((e) => e.id),
  platforms: platformConfig.map((p) => p.id),
};

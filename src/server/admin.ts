import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { methodRank, networks, supports, type AssetId, type NetworkId } from "@/config/payments";
import { sampleAddress } from "@/lib/orders/methods";
import { productId } from "@/config/product";
import { pendingItems } from "@/config/legal";
import { faqGroups, type Assurance, type FaqItem } from "@/config/policies";
import { site, type PageId } from "@/config/site";
import { COPY_SECTIONS, copyFields, isCopyPath } from "@/lib/content";
import { textToSections } from "@/lib/legal-text";
import { getContent, type PageEdit } from "./content";
import { BLOCKS, isBlockId, type HomeBlock } from "@/lib/blocks";
import { getHome, seedHome } from "./home";
import * as s from "@/db/schema";
import { transitions, type OrderStatus } from "@/lib/orders/types";
import { isValidAddress, looksLikeSecret } from "./addresses";
import type { Admin } from "./auth";
import { acceptTotp, hashPassword, MIN_PASSWORD, verifyPassword } from "./auth";
import { getDb } from "./db";
import { notifyOrder, RELEASE_LINK_DAYS, sendTestEmail } from "./email";
import { parseAddress } from "./email/smtp";
import { compareDecimal, dollarsToCents, parseDecimal } from "./money";
import { hashKey, newAccessKey } from "./security";
import { adminTransition, Conflict, NotFound } from "./orders";
import { newTotpSecret, otpauthUri } from "./totp";
import { open, seal } from "./vault";

/** Admin-facing operations. Callers must have passed requireAdmin(); owner checks are repeated here. */

export class AdminError extends Error {}

const actorOf = (a: Admin) => `admin:${a.email}`;
const PENDING: OrderStatus[] = ["payment_submitted", "under_review", "info_required"];
const APPROVED: OrderStatus[] = ["payment_verified", "game_ready"];

function owner(a: Admin) {
  if (a.role !== "owner") throw new AdminError("Only an owner can do that.");
}

async function audit(actor: string, action: string, entity: string, entityId: string, data?: unknown, ipHash?: string) {
  const db = await getDb();
  await db.insert(s.auditLogs).values({ actor, action, entity, entityId, data: data ?? null, ipHash });
}

// ── Overview ────────────────────────────────────────────────────────────────

/** Test (preview) and live data are never mixed in statistics. */
export type Dataset = "live" | "test";
const REVIEW: OrderStatus[] = ["payment_submitted", "under_review"];
/** Fully qualified: drizzle renders single-table columns unqualified, which a correlated subquery would bind to its own table. */
const ORDER_ID = sql.raw(`"orders"."id"`);

export async function overview(dataset: Dataset) {
  const db = await getDb();
  const test = dataset === "test";
  const inSet = eq(s.orders.isTest, test);
  const st = s.orders.status;
  const [[counts], [split], [stock], queue, activity] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        awaiting: sql<number>`count(*) filter (where ${st} = 'awaiting_payment')::int`,
        review: sql<number>`count(*) filter (where ${st} in ('payment_submitted','under_review'))::int`,
        info: sql<number>`count(*) filter (where ${st} = 'info_required')::int`,
        approved: sql<number>`count(*) filter (where ${st} in ('payment_verified','game_ready'))::int`,
        rejected: sql<number>`count(*) filter (where ${st} = 'payment_rejected')::int`,
        fulfillment: sql<number>`count(*) filter (where ${st} = 'payment_verified')::int`,
        released: sql<number>`count(*) filter (where ${st} = 'game_ready')::int`,
        revenue: sql<number>`coalesce(sum(${s.orders.usdCents}) filter (where ${st} in ('payment_verified','game_ready')), 0)::int`,
      })
      .from(s.orders)
      .where(inSet),
    db.select({ live: sql<number>`count(*) filter (where not ${s.orders.isTest})::int`, test: sql<number>`count(*) filter (where ${s.orders.isTest})::int` }).from(s.orders),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.fulfillmentInventory)
      .where(and(eq(s.fulfillmentInventory.isTest, test), isNull(s.fulfillmentInventory.assignedOrderId))),
    db
      .select({
        paymentId: s.orders.paymentId,
        email: s.orders.email,
        asset: s.orders.asset,
        network: s.orders.network,
        expected: s.orders.cryptoAmount,
        status: s.orders.status,
        claimed: sql<string | null>`(select claimed_amount from ${s.paymentSubmissions} ps where ps.order_id = ${ORDER_ID} order by created_at desc limit 1)`,
        waitingSince: s.orders.updatedAt,
      })
      .from(s.orders)
      .where(and(inSet, inArray(st, [...REVIEW, "payment_verified"])))
      .orderBy(sql`case when ${st} = 'payment_verified' then 1 else 0 end`, asc(s.orders.updatedAt))
      .limit(8),
    db
      .select({ id: s.orderStatusHistory.id, paymentId: s.orders.paymentId, to: s.orderStatusHistory.toStatus, actor: s.orderStatusHistory.actor, at: s.orderStatusHistory.createdAt })
      .from(s.orderStatusHistory)
      .innerJoin(s.orders, eq(s.orders.id, s.orderStatusHistory.orderId))
      .where(inSet)
      .orderBy(desc(s.orderStatusHistory.id))
      .limit(10),
  ]);
  return { counts: counts!, split: split!, inventory: stock!.n, queue, activity };
}

/** Payments waiting for a reviewer (sidebar badge), across both datasets. */
export async function reviewCount() {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(inArray(s.orders.status, REVIEW));
  return r!.n;
}

// ── Orders ──────────────────────────────────────────────────────────────────

export const ORDER_SORTS = { priority: "Priority", newest: "Newest", oldest: "Oldest", amount: "Highest price" } as const;
export type OrderSort = keyof typeof ORDER_SORTS;
export type OrderFilter = { q?: string; status?: string; dataset?: string; asset?: string; sort?: string; page?: number };

function orderWhere({ q, status, dataset, asset }: OrderFilter) {
  const term = q?.trim().slice(0, 120);
  const like = term ? `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
  const conds = [
    status === "pending"
      ? inArray(s.orders.status, PENDING)
      : status === "review"
        ? inArray(s.orders.status, REVIEW)
        : status === "approved"
          ? inArray(s.orders.status, APPROVED)
          : status && status in transitions
            ? eq(s.orders.status, status as OrderStatus)
            : undefined,
    dataset === "live" ? eq(s.orders.isTest, false) : dataset === "test" ? eq(s.orders.isTest, true) : undefined,
    asset && /^[A-Z]{2,6}$/.test(asset) ? eq(s.orders.asset, asset) : undefined,
    like
      ? or(
          ilike(s.orders.paymentId, like),
          ilike(s.orders.reference, like),
          ilike(s.orders.email, like),
          sql`exists (select 1 from ${s.paymentSubmissions} ps where ps.order_id = ${ORDER_ID} and ps.txid ilike ${like})`,
        )
      : undefined,
  ].filter(Boolean);
  return conds.length ? and(...conds) : undefined;
}

const orderColumns = {
  paymentId: s.orders.paymentId,
  reference: s.orders.reference,
  email: s.orders.email,
  region: s.orders.region,
  editionId: s.orders.editionId,
  platformId: s.orders.platformId,
  usdCents: s.orders.usdCents,
  asset: s.orders.asset,
  network: s.orders.network,
  cryptoAmount: s.orders.cryptoAmount,
  verifiedAmount: s.orders.verifiedAmount,
  status: s.orders.status,
  isTest: s.orders.isTest,
  createdAt: s.orders.createdAt,
  claimed: sql<string | null>`(select claimed_amount from ${s.paymentSubmissions} ps where ps.order_id = ${ORDER_ID} order by created_at desc limit 1)`,
  txid: sql<string | null>`(select txid from ${s.paymentSubmissions} ps where ps.order_id = ${ORDER_ID} order by created_at desc limit 1)`,
  submittedAt: sql<string | null>`(select max(created_at) from ${s.paymentSubmissions} ps where ps.order_id = ${ORDER_ID})`,
  released: sql<boolean>`exists (select 1 from ${s.fulfillmentInventory} fi where fi.assigned_order_id = ${ORDER_ID})`,
};

function orderSort(sort?: string) {
  switch (sort as OrderSort) {
    case "newest":
      return [desc(s.orders.createdAt)];
    case "oldest":
      return [asc(s.orders.createdAt)];
    case "amount":
      return [desc(s.orders.usdCents), desc(s.orders.createdAt)];
    default:
      // Payments to review first (longest waiting first), then info requests and verified orders
      // awaiting release, then everything else newest first.
      return [
        sql`case ${s.orders.status} when 'payment_submitted' then 0 when 'under_review' then 0 when 'info_required' then 1 when 'payment_verified' then 2 else 3 end`,
        sql`case when ${s.orders.status} in ('payment_submitted','under_review','payment_verified') then ${s.orders.updatedAt} end asc nulls last`,
        desc(s.orders.createdAt),
      ];
  }
}

export const ORDERS_PER_PAGE = 25;

export async function listOrders(filter: OrderFilter) {
  const db = await getDb();
  const where = orderWhere(filter);
  const page = Math.max(1, Math.floor(filter.page ?? 1));
  const [rows, [count]] = await Promise.all([
    db
      .select(orderColumns)
      .from(s.orders)
      .where(where)
      .orderBy(...orderSort(filter.sort))
      .limit(ORDERS_PER_PAGE)
      .offset((page - 1) * ORDERS_PER_PAGE),
    db.select({ n: sql<number>`count(*)::int` }).from(s.orders).where(where),
  ]);
  return { rows, total: count!.n, page, pages: Math.max(1, Math.ceil(count!.n / ORDERS_PER_PAGE)) };
}

/** CSV export (owner only, audited). Capped; uses the same filters as the list. */
export async function exportOrders(admin: Admin, filter: OrderFilter, ipHash: string) {
  owner(admin);
  const db = await getDb();
  const rows = await db.select(orderColumns).from(s.orders).where(orderWhere(filter)).orderBy(...orderSort(filter.sort)).limit(10_000);
  await audit(actorOf(admin), "orders.export", "order", "*", { filter: { ...filter, page: undefined }, rows: rows.length }, ipHash);
  return rows;
}

export async function orderDetail(paymentId: string) {
  const db = await getDb();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.paymentId, paymentId.toUpperCase()));
  if (!order) return null;
  const [submissions, history, fulfillment, auditTrail] = await Promise.all([
    db
      .select({
        id: s.paymentSubmissions.id,
        txid: s.paymentSubmissions.txid,
        claimedAmount: s.paymentSubmissions.claimedAmount,
        message: s.paymentSubmissions.message,
        email: s.paymentSubmissions.email,
        screenshotId: s.paymentSubmissions.screenshotId,
        mime: s.paymentScreenshots.mime,
        bytes: s.paymentScreenshots.bytes,
        purgedAt: s.paymentScreenshots.purgedAt,
        createdAt: s.paymentSubmissions.createdAt,
      })
      .from(s.paymentSubmissions)
      .leftJoin(s.paymentScreenshots, eq(s.paymentScreenshots.id, s.paymentSubmissions.screenshotId))
      .where(eq(s.paymentSubmissions.orderId, order.id))
      .orderBy(desc(s.paymentSubmissions.createdAt)),
    db.select().from(s.orderStatusHistory).where(eq(s.orderStatusHistory.orderId, order.id)).orderBy(desc(s.orderStatusHistory.id)),
    db
      .select({ kind: s.fulfillmentInventory.kind, hint: s.fulfillmentInventory.hint, assignedAt: s.fulfillmentInventory.assignedAt, isTest: s.fulfillmentInventory.isTest })
      .from(s.fulfillmentInventory)
      .where(eq(s.fulfillmentInventory.assignedOrderId, order.id)),
    db.select().from(s.auditLogs).where(and(eq(s.auditLogs.entity, "order"), eq(s.auditLogs.entityId, order.id))).orderBy(desc(s.auditLogs.id)).limit(50),
  ]);
  const available = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.fulfillmentInventory)
    .where(
      and(
        eq(s.fulfillmentInventory.editionId, order.editionId),
        eq(s.fulfillmentInventory.platformId, order.platformId),
        eq(s.fulfillmentInventory.isTest, order.isTest),
        isNull(s.fulfillmentInventory.assignedOrderId),
      ),
    );
  return { order, submissions, history, fulfillment: fulfillment[0] ?? null, auditTrail, inventoryAvailable: available[0]?.n ?? 0 };
}

export const CHECKLIST = [
  { id: "network", label: "Transaction is on the expected network" },
  { id: "asset", label: "Asset matches (correct coin or token contract)" },
  { id: "recipient", label: "Recipient is our receiving address for this order" },
  { id: "amount", label: "Amount received matches the expected amount" },
  { id: "confirmations", label: "Required confirmations reached" },
  { id: "unique", label: "TXID is not used by any other order" },
] as const;

type ReviewInput = { verifiedAmount?: string; checklist?: string[]; customerNote?: string; adminNote?: string };

/**
 * Manual review. Every change is atomic, follows allowed transitions, and is recorded in
 * order history and the audit log. Approval requires the full on-chain checklist and a
 * verified amount at least equal to the expected amount. Never automatic.
 */
export async function review(admin: Admin, paymentId: string, action: "start_review" | "approve" | "request_info" | "reject" | "release" | "note", input: ReviewInput, ipHash: string) {
  const db = await getDb();
  const actor = actorOf(admin);
  // Customer email to send once the change is committed (never from inside the transaction).
  let email = null as { orderId: string; event: Parameters<typeof notifyOrder>[1] } | null;
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(s.orders).where(eq(s.orders.paymentId, paymentId.toUpperCase())).for("update");
    if (!row) throw new NotFound("Order not found.");
    const toReview = async (r: typeof row) => {
      if (r.status === "payment_submitted") {
        await adminTransition(tx, r, "under_review", actor, { ip: ipHash });
        return { ...r, status: "under_review" as const };
      }
      return r;
    };

    switch (action) {
      case "note": {
        const note = input.adminNote?.trim().slice(0, 2000) ?? "";
        await tx.update(s.orders).set({ adminNote: note || null }).where(eq(s.orders.id, row.id));
        await tx.insert(s.auditLogs).values({ actor, action: "order.note", entity: "order", entityId: row.id, data: { note }, ipHash });
        return;
      }
      case "start_review":
        await adminTransition(tx, row, "under_review", actor, { ip: ipHash });
        return;
      case "approve": {
        const missing = CHECKLIST.filter((c) => !input.checklist?.includes(c.id));
        if (missing.length) throw new AdminError(`Confirm every check before approving: ${missing.map((m) => m.label.toLowerCase()).join("; ")}.`);
        let verified: string;
        try {
          verified = parseDecimal(input.verifiedAmount, "Verified amount");
        } catch (e) {
          throw new AdminError((e as Error).message);
        }
        if (!row.isTest && row.rateIsPreview) throw new AdminError("This live order has a preview rate and cannot be approved.");
        if (compareDecimal(verified, row.cryptoAmount) < 0) throw new AdminError(`Verified amount ${verified} is below the expected ${row.cryptoAmount} ${row.asset}. Request information or reject instead.`);
        const r = await toReview(row);
        await tx.update(s.orders).set({ verifiedAmount: verified }).where(eq(s.orders.id, row.id));
        await adminTransition(tx, r, "payment_verified", actor, { ip: ipHash, note: `Verified ${verified} ${row.asset} on ${row.network}`, customerNote: null });
        email = { orderId: row.id, event: { kind: "payment_approved" } };
        return;
      }
      case "request_info":
      case "reject": {
        const note = input.customerNote?.trim().slice(0, 1000);
        if (!note) throw new AdminError("Write a message for the customer explaining what is needed.");
        const r = action === "request_info" ? await toReview(row) : row;
        await adminTransition(tx, r, action === "reject" ? "payment_rejected" : "info_required", actor, { ip: ipHash, note, customerNote: note });
        email = { orderId: row.id, event: { kind: action === "reject" ? "payment_rejected" : "info_required" } };
        return;
      }
      case "release": {
        owner(admin); // releasing a game is an owner decision
        if (row.status !== "payment_verified") throw new AdminError("Only verified payments can be released.");
        const [item] = await tx
          .select({ id: s.fulfillmentInventory.id })
          .from(s.fulfillmentInventory)
          .where(
            and(
              eq(s.fulfillmentInventory.editionId, row.editionId),
              eq(s.fulfillmentInventory.platformId, row.platformId),
              eq(s.fulfillmentInventory.isTest, row.isTest),
              isNull(s.fulfillmentInventory.assignedOrderId),
            ),
          )
          .limit(1)
          .for("update", { skipLocked: true });
        if (!item) throw new AdminError(`No ${row.isTest ? "test " : ""}inventory available for this edition and platform. Add a code in Game Fulfillment first.`);
        await tx.update(s.fulfillmentInventory).set({ assignedOrderId: row.id, assignedAt: new Date() }).where(eq(s.fulfillmentInventory.id, item.id));
        await tx.insert(s.auditLogs).values({ actor, action: "fulfillment.assign", entity: "order", entityId: row.id, data: { inventoryId: item.id }, ipHash });
        // A second, time-limited key for the game-ready email link (stored only as a hash).
        const releaseKey = newAccessKey();
        await tx
          .update(s.orders)
          .set({ releaseKeyHash: hashKey(releaseKey), releaseKeyExpiresAt: new Date(Date.now() + RELEASE_LINK_DAYS * 86_400_000) })
          .where(eq(s.orders.id, row.id));
        await adminTransition(tx, row, "game_ready", actor, { ip: ipHash });
        email = { orderId: row.id, event: { kind: "game_ready", releaseKey } };
        return;
      }
    }
  }).catch((err) => {
    if (err instanceof Conflict) throw new AdminError(err.message);
    throw err;
  });
  if (email) await notifyOrder(email.orderId, email.event);
}

// ── Wallets ─────────────────────────────────────────────────────────────────

/** Every payment method row (enabled first, in display order). Switched-off rows stay for order history. */
export async function listWallets() {
  const db = await getDb();
  const rows = await db.select().from(s.paymentMethods);
  return rows.filter((r) => supports(r.asset, r.network)).sort((a, b) => Number(b.active) - Number(a.active) || methodRank(a.asset, a.network) - methodRank(b.asset, b.network));
}

/** Adds a supported coin/network as a TEST method with a sample address (or switches an existing one back on). */
export async function addWallet(admin: Admin, input: { asset: string; network: string }, ipHash: string) {
  owner(admin);
  if (!supports(input.asset, input.network)) throw new AdminError("That coin is not supported on that network.");
  const db = await getDb();
  const [existing] = await db.select().from(s.paymentMethods).where(and(eq(s.paymentMethods.asset, input.asset), eq(s.paymentMethods.network, input.network)));
  if (existing?.active) throw new AdminError("That payment method is already listed.");
  if (existing) await db.update(s.paymentMethods).set({ active: true, updatedAt: new Date() }).where(and(eq(s.paymentMethods.asset, input.asset), eq(s.paymentMethods.network, input.network)));
  else await db.insert(s.paymentMethods).values({ asset: input.asset, network: input.network, address: sampleAddress(input.asset as AssetId, input.network as NetworkId), validated: false, isTest: true, active: true });
  await audit(actorOf(admin), "wallet.add", "payment_method", `${input.asset}:${input.network}`, { reactivated: Boolean(existing) }, ipHash);
}

export async function updateWallet(admin: Admin, input: { asset: string; network: string; address: string; active: boolean; validated: boolean; live: boolean }, ipHash: string) {
  owner(admin);
  const db = await getDb();
  const address = input.address.trim();
  if (looksLikeSecret(address)) throw new AdminError("That looks like a private key or recovery phrase. Never enter those here. Enter only a public receiving address.");
  const [current] = await db.select().from(s.paymentMethods).where(and(eq(s.paymentMethods.asset, input.asset), eq(s.paymentMethods.network, input.network)));
  if (!current) throw new AdminError("Unknown payment method.");
  if (input.live && !isValidAddress(input.network as NetworkId, address)) throw new AdminError(`That is not a valid ${networks[input.network as NetworkId]?.name ?? ""} address.`);
  if (input.validated && !input.live) throw new AdminError("Only a live (non-test) address can be marked validated.");
  if (!input.live && address && !address.startsWith("PREVIEW-") && !isValidAddress(input.network as NetworkId, address)) throw new AdminError("Invalid address format.");
  // Changing the address always clears validation unless re-confirmed in the same save.
  const validated = input.validated && (address === current.address || input.validated);
  await db
    .update(s.paymentMethods)
    .set({ address, active: input.active, validated, isTest: !input.live, updatedAt: new Date() })
    .where(and(eq(s.paymentMethods.asset, input.asset), eq(s.paymentMethods.network, input.network)));
  await audit(actorOf(admin), "wallet.update", "payment_method", `${input.asset}:${input.network}`, { from: current.address, to: address, active: input.active, validated, live: input.live }, ipHash);
}

// ── Catalogue (WL-2) ────────────────────────────────────────────────────────

/** Everything Admin → Catalogue edits, including hidden editions and platforms. */
export async function catalogAdmin() {
  const db = await getDb();
  const [[product], editions, platforms, prices, items] = await Promise.all([
    db.select().from(s.products).where(eq(s.products.id, productId)),
    db.select().from(s.editions).orderBy(asc(s.editions.sort), asc(s.editions.createdAt)),
    db.select().from(s.platforms).orderBy(asc(s.platforms.sort), asc(s.platforms.id)),
    db.select().from(s.prices),
    db.select().from(s.editionItems).where(eq(s.editionItems.productId, productId)).orderBy(asc(s.editionItems.sort), asc(s.editionItems.createdAt)),
  ]);
  return { product, editions, platforms, prices, items };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A stable id from a name: "Deluxe Edition" becomes "deluxe-edition". */
export const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

function need(value: string, label: string, max: number) {
  const v = value.trim();
  if (!v) throw new AdminError(`${label} is required.`);
  if (v.length > max) throw new AdminError(`${label} must be ${max} characters or fewer.`);
  return v;
}
function optional(value: string, label: string, max: number) {
  const v = value.trim();
  if (v.length > max) throw new AdminError(`${label} must be ${max} characters or fewer.`);
  return v;
}
function sortValue(value: string) {
  const n = Number(value || 0);
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new AdminError("Order must be a whole number from 0 to 999.");
  return n;
}
async function freeId(table: typeof s.editions | typeof s.platforms, base: string) {
  if (!base || !SLUG.test(base)) throw new AdminError("Use letters or numbers in the name.");
  const db = await getDb();
  for (let i = 0; i < 50; i++) {
    const id = i ? `${base}-${i + 1}` : base;
    const [hit] = await db.select({ id: table.id }).from(table).where(eq(table.id, id));
    if (!hit) return id;
  }
  throw new AdminError("Could not create a unique id for that name.");
}

export async function updateProduct(admin: Admin, input: { title: string; shortTitle: string }, ipHash: string) {
  owner(admin);
  const title = need(input.title, "Title", 120);
  const shortTitle = optional(input.shortTitle, "Short title", 40);
  const db = await getDb();
  await db.update(s.products).set({ title, shortTitle }).where(eq(s.products.id, productId));
  await audit(actorOf(admin), "product.update", "product", productId, { title, shortTitle }, ipHash);
}

export async function saveEdition(
  admin: Admin,
  input: { id?: string; name: string; summary: string; shortSummary: string; recommended: boolean; sort: string; active: boolean },
  ipHash: string,
) {
  owner(admin);
  const values = {
    name: need(input.name, "Name", 80),
    summary: optional(input.summary, "Summary", 400),
    shortSummary: optional(input.shortSummary, "Short line", 40),
    recommended: input.recommended,
    sort: sortValue(input.sort),
    active: input.active,
  };
  const db = await getDb();
  if (input.id) {
    const [found] = await db.select({ id: s.editions.id }).from(s.editions).where(eq(s.editions.id, input.id));
    if (!found) throw new AdminError("Unknown edition.");
    if (!values.active) {
      const others = await db.select({ id: s.editions.id }).from(s.editions).where(and(eq(s.editions.active, true), sql`${s.editions.id} <> ${input.id}`));
      if (!others.length) throw new AdminError("Keep at least one edition on sale.");
    }
    await db.update(s.editions).set(values).where(eq(s.editions.id, input.id));
    await audit(actorOf(admin), "edition.update", "edition", input.id, values, ipHash);
  } else {
    const id = await freeId(s.editions, slugify(values.name));
    await db.insert(s.editions).values({ id, productId, ...values });
    await audit(actorOf(admin), "edition.create", "edition", id, values, ipHash);
  }
}

export async function savePlatform(
  admin: Admin,
  input: { id?: string; name: string; shortName: string; sort: string; redeemLabel: string; redeemUrl: string; redeemSteps: string; active: boolean },
  ipHash: string,
) {
  owner(admin);
  const redeemUrl = optional(input.redeemUrl, "Redeem link", 300);
  if (redeemUrl && !/^https:\/\/\S+$/.test(redeemUrl)) throw new AdminError("The redeem link must start with https://.");
  const steps = input.redeemSteps
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (steps.length > 8) throw new AdminError("Use at most 8 redeem steps.");
  if (steps.some((l) => l.length > 200)) throw new AdminError("Each redeem step must be 200 characters or fewer.");
  const values = {
    name: need(input.name, "Name", 60),
    shortName: optional(input.shortName, "Short name", 30),
    sort: sortValue(input.sort),
    redeemLabel: optional(input.redeemLabel, "Redeem button", 60),
    redeemUrl,
    redeemSteps: steps,
    active: input.active,
  };
  const db = await getDb();
  if (input.id) {
    const [found] = await db.select({ id: s.platforms.id }).from(s.platforms).where(eq(s.platforms.id, input.id));
    if (!found) throw new AdminError("Unknown platform.");
    await db.update(s.platforms).set(values).where(eq(s.platforms.id, input.id));
    await audit(actorOf(admin), "platform.update", "platform", input.id, values, ipHash);
  } else {
    const id = await freeId(s.platforms, slugify(values.name));
    await db.insert(s.platforms).values({ id, ...values });
    await audit(actorOf(admin), "platform.create", "platform", id, values, ipHash);
  }
}

export async function saveEditionItem(admin: Admin, input: { id?: string; category: string; name: string; editionIds: string[]; sort: string }, ipHash: string) {
  owner(admin);
  const db = await getDb();
  const known = new Set((await db.select({ id: s.editions.id }).from(s.editions)).map((e) => e.id));
  const values = {
    category: need(input.category, "Category", 60),
    name: need(input.name, "Item", 120),
    editionIds: [...new Set(input.editionIds)].filter((id) => known.has(id)),
    sort: sortValue(input.sort),
  };
  if (input.id) {
    const [found] = await db.select({ id: s.editionItems.id }).from(s.editionItems).where(eq(s.editionItems.id, input.id));
    if (!found) throw new AdminError("Unknown item.");
    await db.update(s.editionItems).set(values).where(eq(s.editionItems.id, input.id));
    await audit(actorOf(admin), "edition_item.update", "edition_item", input.id, values, ipHash);
  } else {
    const [row] = await db.insert(s.editionItems).values({ productId, ...values }).returning({ id: s.editionItems.id });
    await audit(actorOf(admin), "edition_item.create", "edition_item", row!.id, values, ipHash);
  }
}

/** Items carry no order history, so they can be removed outright. */
export async function deleteEditionItem(admin: Admin, id: string, ipHash: string) {
  owner(admin);
  const db = await getDb();
  const [row] = await db.delete(s.editionItems).where(eq(s.editionItems.id, id)).returning();
  if (!row) throw new AdminError("Unknown item.");
  await audit(actorOf(admin), "edition_item.delete", "edition_item", id, { category: row.category, name: row.name }, ipHash);
}

// ── Homepage layout (WL-3) ───────────────────────────────────────────────────

/** Writes the whole layout (order = array order), so the table always holds every block. */
async function writeHome(blocks: HomeBlock[]) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const [i, b] of blocks.entries()) {
      await tx
        .insert(s.homeBlocks)
        .values({ id: b.id, enabled: b.enabled, sort: i, navLabel: b.nav })
        .onConflictDoUpdate({ target: s.homeBlocks.id, set: { enabled: b.enabled, sort: i, navLabel: b.nav, updatedAt: new Date() } });
    }
  });
}

export async function saveHomeBlock(admin: Admin, input: { id: string; enabled: boolean; nav: string }, ipHash: string) {
  owner(admin);
  if (!isBlockId(input.id)) throw new AdminError("Unknown block.");
  const nav = input.nav.trim();
  if (nav.length > 24) throw new AdminError("Menu labels must be 24 characters or fewer.");
  const enabled = input.enabled || Boolean(BLOCKS[input.id].required);
  const blocks = (await getHome()).map((b) => (b.id === input.id ? { ...b, enabled, nav } : b));
  if (blocks.filter((b) => b.enabled && b.nav).length > 7) throw new AdminError("Keep the menu to 7 items or fewer so it fits on one line.");
  await writeHome(blocks);
  await audit(actorOf(admin), "home.block", "home_block", input.id, { enabled, nav }, ipHash);
}

export async function moveHomeBlock(admin: Admin, id: string, direction: "up" | "down", ipHash: string) {
  owner(admin);
  if (!isBlockId(id)) throw new AdminError("Unknown block.");
  if (id === "hero") throw new AdminError("The hero always opens the page.");
  const blocks = [...(await getHome())];
  const i = blocks.findIndex((b) => b.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= blocks.length) return;
  if (blocks[j]!.id === "hero") throw new AdminError("The hero always opens the page.");
  [blocks[i], blocks[j]] = [blocks[j]!, blocks[i]!];
  await writeHome(blocks);
  await audit(actorOf(admin), "home.move", "home_block", id, { direction }, ipHash);
}

/** Back to this client's default layout (src/brand/home.ts). */
export async function resetHome(admin: Admin, ipHash: string) {
  owner(admin);
  await writeHome(seedHome());
  await audit(actorOf(admin), "home.reset", "home_block", "*", {}, ipHash);
}

// ── Content (WL-4) ───────────────────────────────────────────────────────────

async function writeContent(key: string, value: unknown) {
  const db = await getDb();
  await db
    .insert(s.siteContent)
    .values({ key, value })
    .onConflictDoUpdate({ target: s.siteContent.key, set: { value, updatedAt: new Date() } });
}

/** Saves one section's wording. Only fields that differ from the default are stored. */
export async function saveCopy(admin: Admin, section: string, fields: Record<string, string>, ipHash: string) {
  owner(admin);
  if (!(section in COPY_SECTIONS)) throw new AdminError("Unknown section.");
  const defaults = new Map(copyFields().map((f) => [f.path, f.value]));
  const overrides = { ...(await getContent()).copyOverrides };
  const changed: string[] = [];
  for (const [path, raw] of Object.entries(fields)) {
    if (!isCopyPath(path) || !path.startsWith(section + ".")) continue;
    const value = raw.trim();
    if (value.length > 600) throw new AdminError("Each text must be 600 characters or fewer.");
    if (!value || value === defaults.get(path)) delete overrides[path];
    else overrides[path] = value;
    changed.push(path);
  }
  await writeContent("copy", overrides);
  await audit(actorOf(admin), "content.copy", "site_content", section, { fields: changed }, ipHash);
}

export async function resetCopy(admin: Admin, section: string, ipHash: string) {
  owner(admin);
  const overrides = Object.fromEntries(Object.entries((await getContent()).copyOverrides).filter(([p]) => !p.startsWith(section + ".")));
  await writeContent("copy", overrides);
  await audit(actorOf(admin), "content.copy_reset", "site_content", section, {}, ipHash);
}

type FaqInput = { id?: string; group: string; question: string; answer: string; published: boolean; checkoutOnly: boolean; source: string };

export async function saveFaq(admin: Admin, input: FaqInput, ipHash: string) {
  owner(admin);
  if (!faqGroups.some((g) => g.id === input.group)) throw new AdminError("Choose a topic.");
  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!question || question.length > 200) throw new AdminError("The question is required (200 characters or fewer).");
  if (!answer || answer.length > 1500) throw new AdminError("The answer is required (1,500 characters or fewer).");
  const item: FaqItem = {
    id: input.id || `${slugify(question).slice(0, 40)}-${Date.now().toString(36)}`,
    group: input.group as FaqItem["group"],
    question,
    answer,
    status: input.published ? "verified" : "draft",
    ...(input.checkoutOnly && { requires: "checkout" as const }),
    ...(input.source.trim() && { source: input.source.trim().slice(0, 200) }),
  };
  const faq = [...(await getContent()).faq];
  const i = faq.findIndex((f) => f.id === item.id);
  if (input.id && i < 0) throw new AdminError("Unknown question.");
  if (i >= 0) faq[i] = item;
  else faq.push(item);
  await writeContent("faq", faq);
  await audit(actorOf(admin), i >= 0 ? "content.faq_update" : "content.faq_create", "faq", item.id, { status: item.status }, ipHash);
}

export async function deleteFaq(admin: Admin, id: string, ipHash: string) {
  owner(admin);
  const faq = (await getContent()).faq;
  if (!faq.some((f) => f.id === id)) throw new AdminError("Unknown question.");
  await writeContent("faq", faq.filter((f) => f.id !== id));
  await audit(actorOf(admin), "content.faq_delete", "faq", id, {}, ipHash);
}

export async function moveFaq(admin: Admin, id: string, direction: "up" | "down", ipHash: string) {
  owner(admin);
  const faq = [...(await getContent()).faq];
  const i = faq.findIndex((f) => f.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= faq.length) return;
  [faq[i], faq[j]] = [faq[j]!, faq[i]!];
  await writeContent("faq", faq);
  await audit(actorOf(admin), "content.faq_move", "faq", id, { direction }, ipHash);
}

type NoteInput = { id?: string; title: string; body: string; published: boolean };

/** Purchase panel notes (the reassurance lines under the buy button). */
export async function saveNote(admin: Admin, input: NoteInput, ipHash: string) {
  owner(admin);
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 80) throw new AdminError("The title is required (80 characters or fewer).");
  if (!body || body.length > 300) throw new AdminError("The text is required (300 characters or fewer).");
  const notes = [...(await getContent()).notes];
  const i = notes.findIndex((n) => n.id === input.id);
  if (input.id && i < 0) throw new AdminError("Unknown note.");
  const note: Assurance = { id: input.id || `${slugify(title).slice(0, 30)}-${Date.now().toString(36)}`, title, body, icon: i >= 0 ? notes[i]!.icon : "help", status: input.published ? "verified" : "draft" };
  if (i >= 0) notes[i] = note;
  else notes.push(note);
  await writeContent("notes", notes);
  await audit(actorOf(admin), "content.note", "note", note.id, { status: note.status }, ipHash);
}

export async function deleteNote(admin: Admin, id: string, ipHash: string) {
  owner(admin);
  const notes = (await getContent()).notes;
  if (!notes.some((n) => n.id === id)) throw new AdminError("Unknown note.");
  await writeContent("notes", notes.filter((n) => n.id !== id));
  await audit(actorOf(admin), "content.note_delete", "note", id, {}, ipHash);
}

const PAGE_IDS = Object.keys(site.pages) as PageId[];

export async function savePage(
  admin: Admin,
  id: string,
  input: { title: string; heading: string; description: string; intro: string; sections: string; updated: string },
  ipHash: string,
) {
  owner(admin);
  if (!PAGE_IDS.includes(id as PageId)) throw new AdminError("Unknown page.");
  const title = input.title.trim();
  const heading = input.heading.trim();
  if (!title || title.length > 60) throw new AdminError("The browser title is required (60 characters or fewer).");
  if (!heading || heading.length > 120) throw new AdminError("The page heading is required (120 characters or fewer).");
  if (input.description.trim().length > 160) throw new AdminError("The search description must be 160 characters or fewer.");
  if (input.sections.length > 40_000) throw new AdminError("The page text is too long.");
  if (input.updated && !/^\d{4}-\d{2}-\d{2}$/.test(input.updated)) throw new AdminError("Use a date like 2026-11-21 for the last update.");
  const sections = textToSections(input.sections);
  if (!sections.length) throw new AdminError("Add at least one section (a line starting with ## ).");
  const edit: PageEdit = { title, heading, description: input.description.trim(), intro: input.intro.trim(), sections, updated: input.updated || null };
  await writeContent(`page:${id}`, edit);
  // Saving new text with unresolved markers takes a published page back to draft.
  const content = await getContent();
  const page = { ...content.pages[id as PageId], ...edit };
  if (content.published[id as PageId] && pendingItems(page).length) {
    await writeContent("pages", { ...content.published, [id]: false });
  }
  await audit(actorOf(admin), "content.page", "page", id, { sections: sections.length }, ipHash);
}

/** Publishes or unpublishes a page. A page with "To confirm" markers cannot be published. */
export async function setPagePublished(admin: Admin, id: string, published: boolean, ipHash: string) {
  owner(admin);
  if (!PAGE_IDS.includes(id as PageId)) throw new AdminError("Unknown page.");
  const content = await getContent();
  const pending = pendingItems(content.pages[id as PageId]);
  if (published && pending.length) throw new AdminError(`Replace every "To confirm" item first (${pending.length} left), then publish.`);
  await writeContent("pages", { ...content.published, [id]: published });
  await audit(actorOf(admin), published ? "content.publish" : "content.unpublish", "page", id, {}, ipHash);
}

/** Email sender identity (WL-5): display name, reply-to and admin alert recipients. */
export async function saveEmailIdentity(admin: Admin, input: { fromName: string; replyTo: string; adminNotify: string }, ipHash: string) {
  owner(admin);
  const fromName = input.fromName.replace(/["\r\n<>]/g, "").trim();
  if (fromName.length > 60) throw new AdminError("The sender name must be 60 characters or fewer.");
  const check = (v: string, what: string) => {
    try {
      return parseAddress(v).address;
    } catch {
      throw new AdminError(`${what} is not a valid email address: ${v.slice(0, 60)}`);
    }
  };
  const replyTo = input.replyTo.trim() ? check(input.replyTo.trim(), "Reply-to") : "";
  const adminNotify = input.adminNotify
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => check(v, "An alert recipient"));
  if (adminNotify.length > 10) throw new AdminError("Use at most 10 alert recipients.");
  await writeContent("email", { fromName, replyTo, adminNotify });
  await audit(actorOf(admin), "email.identity", "site_content", "email", { fromName, replyTo, recipients: adminNotify.length }, ipHash);
}

// ── Prices ──────────────────────────────────────────────────────────────────

export async function updatePrice(admin: Admin, input: { editionId: string; platformId: string; dollars: string; active: boolean }, ipHash: string) {
  owner(admin);
  let cents: number;
  try {
    cents = dollarsToCents(input.dollars);
  } catch (e) {
    throw new AdminError((e as Error).message);
  }
  const db = await getDb();
  const [before] = await db.select().from(s.prices).where(and(eq(s.prices.editionId, input.editionId), eq(s.prices.platformId, input.platformId)));
  await db
    .insert(s.prices)
    .values({ editionId: input.editionId, platformId: input.platformId, amountCents: cents, active: input.active })
    .onConflictDoUpdate({ target: [s.prices.editionId, s.prices.platformId], set: { amountCents: cents, active: input.active, updatedAt: new Date() } });
  await audit(actorOf(admin), "price.update", "price", `${input.editionId}:${input.platformId}`, { from: before?.amountCents ?? null, to: cents, active: input.active }, ipHash);
}

// ── Fulfillment ─────────────────────────────────────────────────────────────

export async function listInventory() {
  const db = await getDb();
  return db
    .select({
      id: s.fulfillmentInventory.id,
      editionId: s.fulfillmentInventory.editionId,
      platformId: s.fulfillmentInventory.platformId,
      kind: s.fulfillmentInventory.kind,
      hint: s.fulfillmentInventory.hint,
      sourceReference: s.fulfillmentInventory.sourceReference,
      region: s.fulfillmentInventory.region,
      isTest: s.fulfillmentInventory.isTest,
      assignedAt: s.fulfillmentInventory.assignedAt,
      paymentId: s.orders.paymentId,
      createdAt: s.fulfillmentInventory.createdAt,
    })
    .from(s.fulfillmentInventory)
    .leftJoin(s.orders, eq(s.orders.id, s.fulfillmentInventory.assignedOrderId))
    .orderBy(desc(s.fulfillmentInventory.createdAt))
    .limit(200);
}

export async function addInventory(
  admin: Admin,
  input: { editionId: string; platformId: string; kind: "redemption_code" | "access_link"; secret: string; sourceReference: string; region?: string; isTest: boolean },
  ipHash: string,
) {
  owner(admin);
  const secret = input.secret.trim();
  if (secret.length < 4 || secret.length > 500) throw new AdminError("Enter the code or link (4–500 characters).");
  if (input.kind === "access_link" && !/^https:\/\/[^\s]+$/.test(secret)) throw new AdminError("Access links must be https:// URLs from an authorised source.");
  const source = input.sourceReference.trim();
  if (!source) throw new AdminError("Add the supplier or invoice reference that proves this item was legitimately sourced.");
  const db = await getDb();
  const [row] = await db
    .insert(s.fulfillmentInventory)
    .values({
      editionId: input.editionId,
      platformId: input.platformId,
      kind: input.kind,
      secretCiphertext: seal(secret),
      hint: input.kind === "access_link" ? new URL(secret).host : `…${secret.slice(-4)}`,
      sourceReference: source.slice(0, 200),
      region: input.region?.trim().slice(0, 40) || null,
      isTest: input.isTest,
    })
    .returning({ id: s.fulfillmentInventory.id });
  await audit(actorOf(admin), "fulfillment.add", "fulfillment", row!.id, { editionId: input.editionId, platformId: input.platformId, kind: input.kind, source, isTest: input.isTest }, ipHash);
}

export async function removeInventory(admin: Admin, id: string, ipHash: string) {
  owner(admin);
  const db = await getDb();
  const deleted = await db
    .delete(s.fulfillmentInventory)
    .where(and(eq(s.fulfillmentInventory.id, id), isNull(s.fulfillmentInventory.assignedOrderId)))
    .returning({ id: s.fulfillmentInventory.id });
  if (!deleted.length) throw new AdminError("Only unassigned items can be removed.");
  await audit(actorOf(admin), "fulfillment.remove", "fulfillment", id, null, ipHash);
}

// ── Admin users ─────────────────────────────────────────────────────────────

export async function listAdmins() {
  const db = await getDb();
  return db
    .select({ id: s.adminUsers.id, email: s.adminUsers.email, role: s.adminUsers.role, active: s.adminUsers.active, lastLoginAt: s.adminUsers.lastLoginAt, twoFactor: sql<boolean>`${s.adminUsers.totpSecret} is not null` })
    .from(s.adminUsers)
    .orderBy(s.adminUsers.createdAt);
}

export async function createAdmin(admin: Admin, input: { email: string; role: "owner" | "reviewer"; password: string }, ipHash: string) {
  owner(admin);
  if (input.password.length < MIN_PASSWORD) throw new AdminError(`Passwords must be at least ${MIN_PASSWORD} characters.`);
  const db = await getDb();
  try {
    await db.insert(s.adminUsers).values({ email: input.email, role: input.role, passwordHash: await hashPassword(input.password) });
  } catch {
    throw new AdminError("An admin with that email already exists.");
  }
  await audit(actorOf(admin), "admin.create", "admin", input.email, { role: input.role }, ipHash);
}

export async function setAdminActive(admin: Admin, id: string, active: boolean, ipHash: string) {
  owner(admin);
  if (id === admin.id) throw new AdminError("You cannot deactivate yourself.");
  const db = await getDb();
  await db.update(s.adminUsers).set({ active }).where(eq(s.adminUsers.id, id));
  if (!active) await db.delete(s.adminSessions).where(eq(s.adminSessions.adminId, id));
  await audit(actorOf(admin), active ? "admin.activate" : "admin.deactivate", "admin", id, null, ipHash);
}

export async function changePassword(admin: Admin, current: string, next: string, ipHash: string) {
  if (next.length < MIN_PASSWORD) throw new AdminError(`New password must be at least ${MIN_PASSWORD} characters.`);
  const db = await getDb();
  const [user] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.id, admin.id));
  if (!user || !(await verifyPassword(current, user.passwordHash))) throw new AdminError("Current password is incorrect.");
  await db.update(s.adminUsers).set({ passwordHash: await hashPassword(next) }).where(eq(s.adminUsers.id, admin.id));
  await audit(actorOf(admin), "admin.password_change", "admin", admin.id, null, ipHash);
}

// ── Two-factor authentication ───────────────────────────────────────────────

/** Enrollment state for the signed-in admin: the otpauth URI is shown only while pending. */
export async function totpStatus(admin: Admin): Promise<{ enabled: boolean; pending: { uri: string; secret: string } | null }> {
  const db = await getDb();
  const [u] = await db.select({ secret: s.adminUsers.totpSecret, pending: s.adminUsers.totpPending }).from(s.adminUsers).where(eq(s.adminUsers.id, admin.id));
  if (!u) return { enabled: false, pending: null };
  const pendingSecret = u.pending ? open(u.pending) : null;
  return { enabled: Boolean(u.secret), pending: pendingSecret ? { uri: otpauthUri(pendingSecret, admin.email), secret: pendingSecret } : null };
}

export async function startTotp(admin: Admin) {
  const db = await getDb();
  await db.update(s.adminUsers).set({ totpPending: seal(newTotpSecret()) }).where(and(eq(s.adminUsers.id, admin.id), isNull(s.adminUsers.totpSecret)));
}

export async function cancelTotp(admin: Admin) {
  const db = await getDb();
  await db.update(s.adminUsers).set({ totpPending: null }).where(eq(s.adminUsers.id, admin.id));
}

export async function confirmTotp(admin: Admin, code: string, ipHash: string) {
  const db = await getDb();
  const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.id, admin.id));
  if (!u?.totpPending) throw new AdminError("Start the setup first.");
  if (!(await acceptTotp(u.id, u.totpPending, code, u.totpLastStep))) throw new AdminError("That code is not valid. Check the time on your phone and enter the current code.");
  await db.update(s.adminUsers).set({ totpSecret: u.totpPending, totpPending: null }).where(eq(s.adminUsers.id, u.id));
  await audit(actorOf(admin), "admin.2fa_enabled", "admin", u.id, null, ipHash);
}

export async function disableTotp(admin: Admin, code: string, ipHash: string) {
  const db = await getDb();
  const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.id, admin.id));
  if (!u?.totpSecret) throw new AdminError("Two-factor authentication is not on.");
  if (!(await acceptTotp(u.id, u.totpSecret, code, u.totpLastStep))) throw new AdminError("That code is not valid.");
  await db.update(s.adminUsers).set({ totpSecret: null, totpPending: null }).where(eq(s.adminUsers.id, u.id));
  await audit(actorOf(admin), "admin.2fa_disabled", "admin", u.id, null, ipHash);
}

/** Owner recovery for another admin who lost their authenticator. Ends their sessions. */
export async function resetTotp(admin: Admin, id: string, ipHash: string) {
  owner(admin);
  if (id === admin.id) throw new AdminError("Use Turn off for your own account.");
  const db = await getDb();
  await db.update(s.adminUsers).set({ totpSecret: null, totpPending: null }).where(eq(s.adminUsers.id, id));
  await db.delete(s.adminSessions).where(eq(s.adminSessions.adminId, id));
  await audit(actorOf(admin), "admin.2fa_reset", "admin", id, null, ipHash);
}

// ── Screenshot retention ────────────────────────────────────────────────────

/** Days a screenshot is kept. SCREENSHOT_RETENTION_DAYS (7 to 3650, default 90). */
export const retentionDays = () => Math.min(3650, Math.max(7, Math.floor(Number(process.env.SCREENSHOT_RETENTION_DAYS) || 90)));
/** Only closed orders are eligible; anything still open keeps its evidence. */
const CLOSED: OrderStatus[] = ["game_ready", "payment_rejected", "order_expired"];

function dueForPurge() {
  return and(
    isNull(s.paymentScreenshots.purgedAt),
    lt(s.paymentScreenshots.createdAt, sql`now() - make_interval(days => ${retentionDays()})`),
    inArray(s.orders.status, CLOSED),
  );
}

export async function retentionSummary() {
  const db = await getDb();
  const [stored] = await db
    .select({
      kept: sql<number>`count(*) filter (where ${s.paymentScreenshots.purgedAt} is null)::int`,
      purged: sql<number>`count(*) filter (where ${s.paymentScreenshots.purgedAt} is not null)::int`,
      bytes: sql<string>`coalesce(sum(octet_length(${s.paymentScreenshots.data})), 0)::text`,
    })
    .from(s.paymentScreenshots);
  const [due] = await db.select({ n: sql<number>`count(*)::int` }).from(s.paymentScreenshots).innerJoin(s.orders, eq(s.orders.id, s.paymentScreenshots.orderId)).where(dueForPurge());
  return { days: retentionDays(), kept: stored?.kept ?? 0, purged: stored?.purged ?? 0, bytes: Number(stored?.bytes ?? 0), due: due?.n ?? 0 };
}

/** Empties due screenshots (the only change the database allows); size and hash stay as a record. */
export async function purgeScreenshots(admin: Admin, ipHash: string): Promise<number> {
  owner(admin);
  const db = await getDb();
  const ids = (await db.select({ id: s.paymentScreenshots.id }).from(s.paymentScreenshots).innerJoin(s.orders, eq(s.orders.id, s.paymentScreenshots.orderId)).where(dueForPurge())).map((r) => r.id);
  if (!ids.length) return 0;
  await db.transaction(async (tx) => {
    await tx.update(s.paymentScreenshots).set({ data: Buffer.alloc(0), purgedAt: new Date() }).where(and(inArray(s.paymentScreenshots.id, ids), isNull(s.paymentScreenshots.purgedAt)));
    await tx.insert(s.auditLogs).values({ actor: actorOf(admin), action: "screenshot.purge", entity: "screenshot", entityId: `${ids.length} screenshots`, data: { ids, retentionDays: retentionDays() }, ipHash });
  });
  return ids.length;
}

// ── Email ───────────────────────────────────────────────────────────────────

/** Owner-only test email; logged like any other email and audited. */
export async function testEmail(admin: Admin, to: string, ipHash: string) {
  owner(admin);
  try {
    parseAddress(to);
  } catch {
    throw new AdminError("Enter a valid email address.");
  }
  const status = await sendTestEmail(to);
  await audit(actorOf(admin), "email.test", "email", to.toLowerCase(), { status }, ipHash);
  return status;
}

export async function auditEmailRetry(admin: Admin, emailId: string, status: string, ipHash: string) {
  owner(admin);
  await audit(actorOf(admin), "email.retry", "email", emailId, { status }, ipHash);
}

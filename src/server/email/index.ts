import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { networks, type NetworkId } from "@/config/payments";
import { editionName, platformName } from "@/lib/catalog";
import { getCatalog } from "../catalog";
import { site } from "@/config/site";
import * as s from "@/db/schema";
import { checkoutOpen } from "@/lib/checkout";
import { getDb } from "../db";
import { hashKey, newAccessKey } from "../security";
import { getContent } from "../content";
import { parseAddress, sendMail, type SmtpConfig } from "./smtp";
import { renderEmail, type EmailData, type EmailKind, type EmailOrder } from "./templates";

/**
 * Transactional email. Modes (EMAIL_MODE):
 *  - test (default): nothing reaches customers. With EMAIL_TEST_RECIPIENT + SMTP, every email
 *    is redirected there (marked as a test); otherwise it is logged as skipped.
 *  - live: sends to real recipients, and only when live checkout is open.
 *  - off: logged as skipped.
 * Each notification has a unique dedupe key, so it is sent at most once. Bodies are never
 * stored; the log keeps recipient, subject, status and errors. Sending never throws into
 * order processing.
 */

export const RELEASE_LINK_DAYS = 30;

export function emailSettings() {
  const raw = process.env.EMAIL_MODE;
  const mode: "test" | "live" | "off" = raw === "off" ? "off" : raw === "live" && checkoutOpen ? "live" : "test";
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const security = (["tls", "starttls", "none"] as const).find((v) => v === process.env.SMTP_SECURITY) ?? (port === 465 ? "tls" : "starttls");
  const smtp: SmtpConfig | null = host ? { host, port, security, user: process.env.SMTP_USER || undefined, pass: process.env.SMTP_PASS || undefined } : null;
  return {
    mode,
    liveRequested: raw === "live",
    smtp,
    from: process.env.EMAIL_FROM?.trim() || "",
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    testRecipient: process.env.EMAIL_TEST_RECIPIENT?.trim() || "",
    adminNotify: (process.env.ADMIN_NOTIFY_EMAIL ?? "").split(",").map((v) => v.trim()).filter(Boolean),
  };
}

type Send = { kind: EmailKind; to: string; dedupeKey: string; orderId?: string; data: EmailData };
type Status = "sent" | "failed" | "skipped";

/**
 * Sender identity: the display name, reply-to and admin alert recipients from Admin → Emails, over
 * the environment (EMAIL_FROM name, EMAIL_REPLY_TO, ADMIN_NOTIFY_EMAIL), with the store name as the
 * last fallback. The From ADDRESS always comes from EMAIL_FROM (it must match the mail server).
 */
export async function emailIdentity() {
  const cfg = emailSettings();
  const saved = (await getContent()).email;
  let address = "";
  let envName = "";
  try {
    if (cfg.from) ({ address, name: envName = "" } = parseAddress(cfg.from));
  } catch {
    address = "";
  }
  const name = (saved.fromName || envName || site.name).replace(/["\r\n<>]/g, "").trim();
  return {
    name,
    address,
    from: address ? `"${name}" <${address}>` : "",
    replyTo: saved.replyTo || cfg.replyTo || undefined,
    adminNotify: saved.adminNotify.length ? saved.adminNotify : cfg.adminNotify,
  };
}

/** Renders and sends one logged email row (first attempt or retry) and records the outcome. */
async function deliver(rowId: string, kind: EmailKind, to: string, data: EmailData): Promise<Status> {
  const cfg = emailSettings();
  const testMode = cfg.mode !== "live";
  const redirect = testMode && cfg.testRecipient && cfg.testRecipient.toLowerCase() !== to.toLowerCase() ? cfg.testRecipient : null;
  const email = renderEmail(kind, { ...data, redirectedFrom: redirect ? to : undefined });
  const subject = testMode && !email.subject.startsWith("[Test]") ? `[Test] ${email.subject}` : email.subject;
  const db = await getDb();
  const attempt = { attempts: sql`${s.emailMessages.attempts} + 1`, subject, testMode, deliveredTo: redirect };

  const skip = cfg.mode === "off" ? "Email is turned off (EMAIL_MODE=off)." : !cfg.smtp || !cfg.from ? "SMTP is not configured." : testMode && !cfg.testRecipient ? "Test mode: set EMAIL_TEST_RECIPIENT to receive test emails." : null;
  if (skip) {
    await db.update(s.emailMessages).set({ ...attempt, status: "skipped", error: skip }).where(eq(s.emailMessages.id, rowId));
    return "skipped";
  }
  try {
    const id = await emailIdentity();
    const result = await sendMail(cfg.smtp!, { from: id.from || cfg.from, to: redirect ?? to, replyTo: id.replyTo, subject, text: email.text, html: email.html, headers: { "X-Vice-Email": kind } });
    await db.update(s.emailMessages).set({ ...attempt, status: "sent", sentAt: new Date(), providerId: result.messageId, error: null }).where(eq(s.emailMessages.id, rowId));
    return "sent";
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await db.update(s.emailMessages).set({ ...attempt, status: "failed", error: message }).where(eq(s.emailMessages.id, rowId));
    console.error(`[email] ${kind} ${rowId} failed: ${message}`);
    return "failed";
  }
}

/** Sends once per dedupe key and records the outcome. Returns the log status. */
export async function sendEmail({ kind, to, dedupeKey, orderId, data }: Send): Promise<Status | "duplicate"> {
  const db = await getDb();
  const [row] = await db
    .insert(s.emailMessages)
    .values({ orderId, kind, dedupeKey, recipient: to, subject: kind, testMode: emailSettings().mode !== "live" })
    .onConflictDoNothing()
    .returning({ id: s.emailMessages.id });
  if (!row) return "duplicate";
  return deliver(row.id, kind, to, data);
}

const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const orderLink = (paymentId: string, key?: string) => `${site.url}/order-status?id=${encodeURIComponent(paymentId)}${key ? `#key=${key}` : ""}`;

async function loadOrder(orderId: string) {
  const db = await getDb();
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) return null;
  const catalog = await getCatalog();
  const [sub] = await db.select().from(s.paymentSubmissions).where(eq(s.paymentSubmissions.orderId, orderId)).orderBy(desc(s.paymentSubmissions.createdAt)).limit(1);
  const order: EmailOrder = {
    paymentId: o.paymentId,
    reference: o.reference,
    edition: editionName(catalog, o.editionId),
    platform: platformName(catalog, o.platformId),
    price: usd(o.usdCents),
    amount: o.cryptoAmount,
    asset: o.asset,
    network: networks[o.network as NetworkId]?.name ?? o.network,
    address: o.address,
    quoteExpiresAt: o.quoteExpiresAt,
    txid: sub?.txid,
    claimedAmount: sub?.claimedAmount,
    verifiedAmount: o.verifiedAmount,
    email: o.email,
    isTest: o.isTest,
  };
  return { row: o, order, submissionId: sub?.id };
}

type Event =
  | { kind: "order_created"; accessKey: string }
  | { kind: "payment_submitted" }
  | { kind: "payment_approved" }
  | { kind: "payment_rejected" }
  | { kind: "info_required" }
  | { kind: "game_ready"; releaseKey: string };

/** Customer email for an order event (+ admin alert on submissions). Never throws. */
export async function notifyOrder(orderId: string, event: Event): Promise<void> {
  try {
    const loaded = await loadOrder(orderId);
    if (!loaded) return;
    const { row, order, submissionId } = loaded;
    const base = { order, link: orderLink(row.paymentId) };
    // Submission-scoped keys: a resubmission after "info required" is a new event, a retry is not.
    const round = submissionId ?? "none";
    switch (event.kind) {
      case "order_created":
        await sendEmail({ kind: "order_created", to: row.email, orderId, dedupeKey: `order_created:${orderId}`, data: { ...base, link: orderLink(row.paymentId, event.accessKey) } });
        return;
      case "payment_submitted": {
        await sendEmail({ kind: "payment_submitted", to: row.email, orderId, dedupeKey: `payment_submitted:${round}`, data: base });
        for (const to of await adminRecipients()) {
          await sendEmail({ kind: "admin_submission", to, orderId, dedupeKey: `admin_submission:${round}:${to.toLowerCase()}`, data: { order, link: `${site.url}/admin/orders/${row.paymentId}` } });
        }
        return;
      }
      case "payment_approved":
        await sendEmail({ kind: "payment_approved", to: row.email, orderId, dedupeKey: `payment_approved:${orderId}`, data: base });
        return;
      case "payment_rejected":
        await sendEmail({ kind: "payment_rejected", to: row.email, orderId, dedupeKey: `payment_rejected:${orderId}`, data: { ...base, note: row.customerNote } });
        return;
      case "info_required":
        await sendEmail({ kind: "info_required", to: row.email, orderId, dedupeKey: `info_required:${round}`, data: { ...base, note: row.customerNote } });
        return;
      case "game_ready": {
        const db = await getDb();
        const [item] = await db.select({ kind: s.fulfillmentInventory.kind }).from(s.fulfillmentInventory).where(eq(s.fulfillmentInventory.assignedOrderId, orderId));
        await sendEmail({
          kind: "game_ready",
          to: row.email,
          orderId,
          dedupeKey: `game_ready:${orderId}`,
          data: { ...base, link: orderLink(row.paymentId, event.releaseKey), fulfillmentKind: item?.kind, linkDays: RELEASE_LINK_DAYS },
        });
        return;
      }
    }
  } catch (err) {
    console.error(`[email] ${event.kind} for ${orderId} failed:`, err instanceof Error ? err.message : err);
  }
}

const TOPICS: Record<string, string> = { order: "An order", payment: "A payment", delivery: "Game delivery", refund: "A refund", other: "Something else" };

async function supportData(id: string): Promise<EmailData["support"] | null> {
  const db = await getDb();
  const [m] = await db.select().from(s.supportMessages).where(eq(s.supportMessages.id, id));
  return m ? { reference: m.reference, topic: TOPICS[m.topic] ?? m.topic, paymentId: m.paymentId, name: m.name, email: m.email, message: m.message, isTest: m.isTest } : null;
}

async function adminRecipients() {
  const { adminNotify } = await emailIdentity();
  if (adminNotify.length) return adminNotify;
  const db = await getDb();
  return (await db.select({ email: s.adminUsers.email }).from(s.adminUsers).where(and(eq(s.adminUsers.role, "owner"), eq(s.adminUsers.active, true)))).map((a) => a.email);
}

/** Contact form: acknowledgement to the customer and an alert to admins. Never throws. */
export async function notifySupport(id: string): Promise<void> {
  try {
    const support = await supportData(id);
    if (!support) return;
    await sendEmail({ kind: "support_received", to: support.email, dedupeKey: `support_received:${id}`, data: { support } });
    for (const to of await adminRecipients()) {
      await sendEmail({ kind: "admin_support", to, dedupeKey: `admin_support:${id}:${to.toLowerCase()}`, data: { support, link: `${site.url}/admin/support?id=${id}` } });
    }
  } catch (err) {
    console.error("[email] support notification failed:", err instanceof Error ? err.message : err);
  }
}

export class RetryError extends Error {}

/**
 * Owner retry of a failed email: rebuilt from current records (bodies are never stored) and
 * sent again on the same log row. A game-ready retry issues a fresh 30-day release key; an
 * order-created retry links to the status page without the private key (only its hash is
 * kept), where the customer can use their Payment ID and email.
 */
export async function retryEmail(id: string): Promise<Status> {
  const db = await getDb();
  const [row] = await db.select().from(s.emailMessages).where(eq(s.emailMessages.id, id));
  if (!row) throw new RetryError("Email not found.");
  if (row.status !== "failed") throw new RetryError("Only failed emails can be retried.");
  const kind = row.kind as EmailKind;
  let data: EmailData = {};

  if (kind === "support_received" || kind === "admin_support") {
    const supportId = row.dedupeKey.split(":")[1]!;
    const support = await supportData(supportId);
    if (!support) throw new RetryError("The support message no longer exists.");
    data = { support, link: kind === "admin_support" ? `${site.url}/admin/support?id=${supportId}` : undefined };
  } else if (kind !== "test") {
    if (!row.orderId) throw new RetryError("This email is not linked to an order.");
    const loaded = await loadOrder(row.orderId);
    if (!loaded) throw new RetryError("Order not found.");
    const { row: o, order } = loaded;
    data = { order, link: kind === "admin_submission" ? `${site.url}/admin/orders/${o.paymentId}` : orderLink(o.paymentId), note: o.customerNote };
    if (kind === "game_ready") {
      const releaseKey = newAccessKey();
      await db
        .update(s.orders)
        .set({ releaseKeyHash: hashKey(releaseKey), releaseKeyExpiresAt: new Date(Date.now() + RELEASE_LINK_DAYS * 86_400_000) })
        .where(eq(s.orders.id, o.id));
      const [item] = await db.select({ kind: s.fulfillmentInventory.kind }).from(s.fulfillmentInventory).where(eq(s.fulfillmentInventory.assignedOrderId, o.id));
      data = { ...data, link: orderLink(o.paymentId, releaseKey), fulfillmentKind: item?.kind, linkDays: RELEASE_LINK_DAYS };
    }
  }
  return deliver(row.id, kind, row.recipient, data);
}

/** Admin settings: send a test email (always counts as a test; unique per click). */
export async function sendTestEmail(to: string) {
  return sendEmail({ kind: "test", to, dedupeKey: `test:${crypto.randomUUID()}`, data: {} });
}

export async function emailLog(opts: { orderId?: string; limit?: number } = {}) {
  const db = await getDb();
  const q = db.select().from(s.emailMessages);
  return (opts.orderId ? q.where(eq(s.emailMessages.orderId, opts.orderId)) : q).orderBy(desc(s.emailMessages.createdAt)).limit(opts.limit ?? 50);
}

/** Sample data for the admin template preview. */
export const sampleOrder: EmailOrder = {
  paymentId: "VICE-7K2M9QXR",
  reference: "ORD-4H8T2C",
  edition: "Standard Edition",
  platform: "PlayStation 5",
  price: "$19.00",
  amount: "19.00",
  asset: "USDT",
  network: "Tron",
  address: "PREVIEW-TRON-USDT-NOT-A-REAL-ADDRESS",
  quoteExpiresAt: new Date(Date.now() + 30 * 60_000),
  txid: "9f2c4e7a1b3d5f6e8a0c2e4f6a8b0d2e4f6a8c0e2d4f6b8a0c2e4f6a8b0d2e4f",
  claimedAmount: "19.00",
  verifiedAmount: "19.00",
  email: "buyer@example.com",
  isTest: true,
};

import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { networks, type NetworkId } from "@/config/payments";
import { editions, platforms } from "@/config/product";
import { site } from "@/config/site";
import * as s from "@/db/schema";
import { checkoutOpen } from "@/lib/checkout";
import { getDb } from "../db";
import { sendMail, type SmtpConfig } from "./smtp";
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

/** Sends once per dedupe key and records the outcome. Returns the log status. */
export async function sendEmail({ kind, to, dedupeKey, orderId, data }: Send): Promise<"sent" | "failed" | "skipped" | "duplicate"> {
  const cfg = emailSettings();
  const testMode = cfg.mode !== "live";
  const redirect = testMode && cfg.testRecipient && cfg.testRecipient.toLowerCase() !== to.toLowerCase() ? cfg.testRecipient : null;
  const email = renderEmail(kind, { ...data, redirectedFrom: redirect ? to : undefined });
  const subject = testMode && !email.subject.startsWith("[Test]") ? `[Test] ${email.subject}` : email.subject;

  const db = await getDb();
  const [row] = await db
    .insert(s.emailMessages)
    .values({ orderId, kind, dedupeKey, recipient: to, deliveredTo: redirect, subject, testMode })
    .onConflictDoNothing()
    .returning({ id: s.emailMessages.id });
  if (!row) return "duplicate";

  const skip = cfg.mode === "off" ? "Email is turned off (EMAIL_MODE=off)." : !cfg.smtp || !cfg.from ? "SMTP is not configured." : testMode && !cfg.testRecipient ? "Test mode: set EMAIL_TEST_RECIPIENT to receive test emails." : null;
  if (skip) {
    await db.update(s.emailMessages).set({ status: "skipped", error: skip }).where(eq(s.emailMessages.id, row.id));
    return "skipped";
  }
  try {
    const result = await sendMail(cfg.smtp!, { from: cfg.from, to: redirect ?? to, replyTo: cfg.replyTo, subject, text: email.text, html: email.html, headers: { "X-Vice-Email": kind } });
    await db.update(s.emailMessages).set({ status: "sent", attempts: 1, sentAt: new Date(), providerId: result.messageId, error: null }).where(eq(s.emailMessages.id, row.id));
    return "sent";
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await db.update(s.emailMessages).set({ status: "failed", attempts: 1, error: message }).where(eq(s.emailMessages.id, row.id));
    console.error(`[email] ${kind} ${dedupeKey} failed: ${message}`);
    return "failed";
  }
}

const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const orderLink = (paymentId: string, key?: string) => `${site.url}/order-status?id=${encodeURIComponent(paymentId)}${key ? `#key=${key}` : ""}`;

async function loadOrder(orderId: string) {
  const db = await getDb();
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) return null;
  const [sub] = await db.select().from(s.paymentSubmissions).where(eq(s.paymentSubmissions.orderId, orderId)).orderBy(desc(s.paymentSubmissions.createdAt)).limit(1);
  const order: EmailOrder = {
    paymentId: o.paymentId,
    reference: o.reference,
    edition: editions.find((e) => e.id === o.editionId)?.name ?? o.editionId,
    platform: platforms.find((p) => p.id === o.platformId)?.name ?? o.platformId,
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
        const cfg = emailSettings();
        let admins = cfg.adminNotify;
        if (!admins.length) {
          const db = await getDb();
          admins = (await db.select({ email: s.adminUsers.email }).from(s.adminUsers).where(and(eq(s.adminUsers.role, "owner"), eq(s.adminUsers.active, true)))).map((a) => a.email);
        }
        for (const to of admins) {
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

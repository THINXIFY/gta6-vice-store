import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Commerce schema. Money is stored in integer cents (USD) and crypto amounts as exact
 * decimal strings. All timestamps are timestamptz.
 */

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const DECIMAL = "^[0-9]+(\\.[0-9]+)?$";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => Buffer.from(v),
});

export const orderStatus = pgEnum("order_status", [
  "awaiting_payment",
  "payment_submitted",
  "under_review",
  "info_required",
  "payment_verified",
  "game_ready",
  "payment_rejected",
  "order_expired",
]);

export const emailStatus = pgEnum("email_status", ["pending", "sent", "failed", "skipped"]);
export const fulfillmentKind = pgEnum("fulfillment_kind", ["redemption_code", "access_link"]);
export const adminRole = pgEnum("admin_role", ["owner", "reviewer"]);

// ── Catalogue ────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: created(),
});

export const editions = pgTable("editions", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

export const platforms = pgTable("platforms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

/** Authoritative prices. The browser never supplies an amount. */
export const prices = pgTable(
  "prices",
  {
    editionId: text("edition_id").notNull().references(() => editions.id),
    platformId: text("platform_id").notNull().references(() => platforms.id),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    active: boolean("active").notNull().default(true),
    updatedAt: updated(),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.platformId] }),
    check("prices_amount_positive", sql`${t.amountCents} > 0`),
    check("prices_currency_iso", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);

// ── Payment configuration ────────────────────────────────────────────────────

/** Asset/network pairs and their receiving address. Never stores keys or seed phrases. */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    asset: text("asset").notNull(),
    network: text("network").notNull(),
    address: text("address").notNull().default(""),
    validated: boolean("validated").notNull().default(false),
    active: boolean("active").notNull().default(true),
    /** Test methods carry sample addresses and can only create test orders. */
    isTest: boolean("is_test").notNull().default(true),
    updatedAt: updated(),
  },
  (t) => [primaryKey({ columns: [t.asset, t.network] })],
);

// ── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: text("payment_id").notNull(),
    reference: text("reference").notNull(),
    email: text("email").notNull(),
    region: text("region").notNull(),
    editionId: text("edition_id").notNull().references(() => editions.id),
    platformId: text("platform_id").notNull().references(() => platforms.id),
    usdCents: integer("usd_cents").notNull(),
    asset: text("asset").notNull(),
    network: text("network").notNull(),
    cryptoAmount: text("crypto_amount").notNull(),
    rate: text("rate").notNull(),
    rateIsPreview: boolean("rate_is_preview").notNull(),
    /** Where the locked rate came from (e.g. "coingecko", "coinbase", "fixed"). */
    rateSource: text("rate_source"),
    address: text("address").notNull(),
    quoteExpiresAt: timestamp("quote_expires_at", { withTimezone: true }).notNull(),
    status: orderStatus("status").notNull().default("awaiting_payment"),
    customerNote: text("customer_note"),
    /** Amount the administrator confirmed on-chain (exact decimal string). */
    verifiedAmount: text("verified_amount"),
    /** Internal notes, never shown to the customer. */
    adminNote: text("admin_note"),
    accessKeyHash: text("access_key_hash").notNull(),
    /** Second, time-limited access key sent in the game-ready email (SHA-256 only). */
    releaseKeyHash: text("release_key_hash"),
    releaseKeyExpiresAt: timestamp("release_key_expires_at", { withTimezone: true }),
    isTest: boolean("is_test").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("orders_payment_id_key").on(t.paymentId),
    uniqueIndex("orders_reference_key").on(t.reference),
    index("orders_status_idx").on(t.status, t.createdAt),
    index("orders_email_idx").on(sql`lower(${t.email})`),
    check("orders_payment_id_format", sql`${t.paymentId} ~ '^VICE-[0-9A-HJKMNP-TV-Z]{8}$'`),
    check("orders_usd_positive", sql`${t.usdCents} > 0`),
    check("orders_amount_decimal", sql`${t.cryptoAmount} ~ ${sql.raw(`'${DECIMAL}'`)}`),
    check("orders_access_key_sha256", sql`${t.accessKeyHash} ~ '^[0-9a-f]{64}$'`),
    check("orders_release_key_sha256", sql`${t.releaseKeyHash} is null or ${t.releaseKeyHash} ~ '^[0-9a-f]{64}$'`),
    check("orders_verified_amount_decimal", sql`${t.verifiedAmount} is null or ${t.verifiedAmount} ~ ${sql.raw(`'${DECIMAL}'`)}`),
  ],
);

/** Payment screenshots, stored privately in the database (admin-only access). */
export const paymentScreenshots = pgTable(
  "payment_screenshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    /** Emptied by a retention purge; metadata (size, hash) is kept as a record. */
    data: bytea("data").notNull(),
    purgedAt: timestamp("purged_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    index("payment_screenshots_order_idx").on(t.orderId),
    check("payment_screenshots_mime", sql`${t.mime} in ('image/png', 'image/jpeg', 'image/webp')`),
    check("payment_screenshots_size", sql`${t.bytes} > 0 and ${t.bytes} <= 5242880`),
  ],
);

/** Every proof a customer submits. A TXID is unique per network across all orders. */
export const paymentSubmissions = pgTable(
  "payment_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    network: text("network").notNull(),
    txid: text("txid").notNull(),
    txidNormalized: text("txid_normalized").notNull(),
    email: text("email").notNull(),
    /** Amount the customer says they sent (exact decimal string). */
    claimedAmount: text("claimed_amount").notNull(),
    message: text("message"),
    screenshotId: uuid("screenshot_id").references(() => paymentScreenshots.id),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("payment_submissions_network_txid_key").on(t.network, t.txidNormalized),
    index("payment_submissions_order_idx").on(t.orderId),
    check("payment_submissions_claimed_decimal", sql`${t.claimedAmount} ~ ${sql.raw(`'${DECIMAL}'`)}`),
  ],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    /** "customer" | "system" | "admin:<email>" | "test" */
    actor: text("actor").notNull(),
    note: text("note"),
    createdAt: created(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId, t.createdAt)],
);

/** Append-only record of every privileged or state-changing action. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    data: jsonb("data"),
    ipHash: text("ip_hash"),
    createdAt: created(),
  },
  (t) => [index("audit_logs_entity_idx").on(t.entity, t.entityId, t.createdAt), index("audit_logs_created_idx").on(t.createdAt)],
);

// ── Fulfillment ──────────────────────────────────────────────────────────────

/**
 * Legitimately sourced redemption codes or authorised access links, encrypted at rest
 * (AES-256-GCM, key from env) and released only to the order holder after approval.
 */
export const fulfillmentInventory = pgTable(
  "fulfillment_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: text("edition_id").notNull().references(() => editions.id),
    platformId: text("platform_id").notNull().references(() => platforms.id),
    kind: fulfillmentKind("kind").notNull().default("redemption_code"),
    secretCiphertext: text("secret_ciphertext").notNull(),
    /** Last characters, for admin identification without decrypting. */
    hint: text("hint").notNull().default(""),
    sourceReference: text("source_reference").notNull(),
    region: text("region"),
    assignedOrderId: uuid("assigned_order_id").references(() => orders.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    isTest: boolean("is_test").notNull().default(false),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("fulfillment_inventory_assigned_order_key").on(t.assignedOrderId),
    index("fulfillment_inventory_available_idx").on(t.editionId, t.platformId).where(sql`${t.assignedOrderId} is null`),
    check("fulfillment_assignment_consistent", sql`(${t.assignedOrderId} is null) = (${t.assignedAt} is null)`),
  ],
);

// ── Administration ───────────────────────────────────────────────────────────

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    /** scrypt$N$r$p$salt$hash */
    passwordHash: text("password_hash").notNull(),
    role: adminRole("role").notNull().default("reviewer"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** TOTP secret, encrypted (vault). Set once enrollment is confirmed. */
    totpSecret: text("totp_secret"),
    /** Secret awaiting confirmation during enrollment, encrypted. */
    totpPending: text("totp_pending"),
    /** Last accepted TOTP time step: a code is never accepted twice. */
    totpLastStep: bigint("totp_last_step", { mode: "number" }),
    createdAt: created(),
  },
  (t) => [uniqueIndex("admin_users_email_key").on(sql`lower(${t.email})`)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").notNull().references(() => adminUsers.id),
    /** SHA-256 of the session token (the token itself only lives in the cookie). */
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipHash: text("ip_hash"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("admin_sessions_token_key").on(t.tokenHash), index("admin_sessions_admin_idx").on(t.adminId)],
);

/** Shared fixed-window rate limiting (works across instances). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/**
 * Transactional email log. dedupe_key is unique, so each notification is sent at most once.
 * Bodies are never stored (they can carry private order links).
 */
export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id),
    kind: text("kind").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    /** Intended recipient. */
    recipient: text("recipient").notNull(),
    /** Actual recipient when test mode redirects mail (null = not redirected). */
    deliveredTo: text("delivered_to"),
    subject: text("subject").notNull(),
    status: emailStatus("status").notNull().default("pending"),
    testMode: boolean("test_mode").notNull(),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    providerId: text("provider_id"),
    createdAt: created(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("email_messages_dedupe_key").on(t.dedupeKey),
    index("email_messages_order_idx").on(t.orderId, t.createdAt),
    check("email_messages_dedupe_unique_key", sql`length(${t.dedupeKey}) between 3 and 200`),
  ],
);

/** Customer support messages from the contact form (Admin → Support). Never deleted. */
export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Customer-facing reference, e.g. SUP-7K2M9Q. */
    reference: text("reference").notNull(),
    name: text("name"),
    email: text("email").notNull(),
    topic: text("topic").notNull(),
    paymentId: text("payment_id"),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    isTest: boolean("is_test").notNull(),
    ipHash: text("ip_hash"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("support_messages_reference_key").on(t.reference),
    index("support_messages_status_idx").on(t.status, t.createdAt),
    check("support_messages_status", sql`${t.status} in ('open', 'resolved')`),
    check("support_messages_topic", sql`${t.topic} in ('order', 'payment', 'delivery', 'refund', 'other')`),
    check("support_messages_lengths", sql`length(${t.message}) between 10 and 4000 and length(${t.email}) <= 254 and (${t.name} is null or length(${t.name}) <= 120)`),
    check("support_messages_payment_id", sql`${t.paymentId} is null or ${t.paymentId} ~ '^VICE-[0-9A-HJKMNP-TV-Z]{8}$'`),
  ],
);

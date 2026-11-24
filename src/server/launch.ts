import "server-only";
import { indexable } from "@/lib/seo";
import { and, eq, isNull, sql } from "drizzle-orm";
import { brand } from "@/brand/brand";
import { pendingItems } from "@/config/legal";
import { site } from "@/config/site";
import * as s from "@/db/schema";
import { editionName, platformShortName } from "@/lib/catalog";
import { checkoutOpen } from "@/lib/checkout";
import { contentPreview } from "@/lib/media";
import { require2fa } from "./auth";
import { getCatalog } from "./catalog";
import { getContent } from "./content";
import { getDb } from "./db";
import { emailIdentity, emailSettings } from "./email";

export type Check = {
  id: string;
  group: "Business" | "Store" | "Payments and delivery" | "Infrastructure" | "Security";
  title: string;
  ok: boolean;
  /** Blocks taking real orders safely (vs. recommended). */
  required: boolean;
  detail: string;
  /** Where to fix it: an admin page, or a file/env hint. */
  fix: { href?: string; label: string };
};

/**
 * The launch checklist (WL-6): what a client copy needs before it takes real orders, computed from
 * the live configuration. Never reveals secret values, only whether they are set.
 */
export async function launchChecks(): Promise<Check[]> {
  const [catalog, content, db] = await Promise.all([getCatalog(), getContent(), getDb()]);
  const env = (k: string) => Boolean(process.env[k]?.trim());
  const url = site.url;

  const [methods, inventory, owners] = await Promise.all([
    db.select().from(s.paymentMethods).where(eq(s.paymentMethods.active, true)),
    db
      .select({ editionId: s.fulfillmentInventory.editionId, platformId: s.fulfillmentInventory.platformId, n: sql<number>`count(*)::int` })
      .from(s.fulfillmentInventory)
      .where(and(isNull(s.fulfillmentInventory.assignedAt), eq(s.fulfillmentInventory.isTest, false)))
      .groupBy(s.fulfillmentInventory.editionId, s.fulfillmentInventory.platformId),
    db.select({ email: s.adminUsers.email, totp: s.adminUsers.totpSecret }).from(s.adminUsers).where(and(eq(s.adminUsers.role, "owner"), eq(s.adminUsers.active, true))),
  ]);

  const onSale = Object.entries(catalog.prices).filter(([k, v]) => typeof v === "number" && v > 0 && catalog.platforms.some((p) => p.available && k.endsWith(`:${p.id}`)));
  const live = methods.filter((m) => !m.isTest && m.validated && m.address);
  const stock = (key: string) => inventory.find((r) => `${r.editionId}:${r.platformId}` === key)?.n ?? 0;
  const emptyStock = onSale.map(([k]) => k).filter((k) => stock(k) === 0);
  const legal = (["terms", "privacy", "refunds"] as const).map((id) => ({ id, label: site.pages[id].label, published: content.published[id], pending: pendingItems(content.pages[id]).length }));
  const mail = emailSettings();
  const sender = await emailIdentity();

  return [
    {
      id: "seller",
      group: "Business",
      title: "Business details",
      ok: Boolean(brand.seller.legalName && brand.seller.supportEmail),
      required: true,
      detail: brand.seller.legalName ? `${brand.seller.legalName}${brand.seller.supportEmail ? `, ${brand.seller.supportEmail}` : ", no support email"}` : "Legal name and support email are not set.",
      fix: { label: "src/brand/brand.ts → seller" },
    },
    {
      id: "legal",
      group: "Business",
      title: "Terms, Privacy and Refund pages published",
      ok: legal.every((p) => p.published),
      required: true,
      detail: legal.map((p) => `${p.label}: ${p.published ? "published" : p.pending ? `${p.pending} to confirm` : "ready to publish"}`).join(" · "),
      fix: { href: "/admin/content?tab=pages", label: "Content → Pages" },
    },
    {
      id: "catalogue",
      group: "Store",
      title: "Something on sale",
      ok: onSale.length > 0,
      required: true,
      detail: onSale.length ? `${onSale.length} edition and platform prices on sale.` : "No edition has a price on sale on an available platform.",
      fix: { href: "/admin/pricing", label: "Catalogue" },
    },
    {
      id: "checkout",
      group: "Store",
      title: "Checkout switched on",
      ok: checkoutOpen,
      required: true,
      detail: checkoutOpen ? "Buyers can place real orders." : "Checkout is closed (commerce.checkoutEnabled).",
      fix: { label: "src/config/product.ts → commerce" },
    },
    {
      id: "preview",
      group: "Store",
      title: "Draft preview off",
      ok: !contentPreview,
      required: true,
      detail:
        contentPreview ? "On: draft text is shown. Never on a public site." : "Only published text is shown.",
      fix: { label: "Unset NEXT_PUBLIC_CONTENT_PREVIEW" },
    },
    {
      id: "wallets",
      group: "Payments and delivery",
      title: "Payment methods taking payments",
      ok: live.length > 0,
      required: true,
      detail: live.length ? `${live.length} live, validated: ${live.map((m) => `${m.asset} (${m.network})`).join(", ")}.` : "No method is live and validated.",
      fix: { href: "/admin/wallets", label: "Wallets" },
    },
    {
      id: "stock",
      group: "Payments and delivery",
      title: "Game codes in stock",
      ok: onSale.length > 0 && emptyStock.length === 0,
      required: true,
      detail: emptyStock.length ? `No live codes for: ${emptyStock.map((k) => { const [e, p] = k.split(":"); return `${editionName(catalog, e!)} on ${platformShortName(catalog, p!)}`; }).join(", ")}.` : onSale.length ? "Every edition and platform on sale has codes." : "Nothing on sale yet.",
      fix: { href: "/admin/fulfillment", label: "Game Fulfillment" },
    },
    {
      id: "email",
      group: "Payments and delivery",
      title: "Customer emails sending",
      ok: mail.mode === "live" && Boolean(mail.smtp) && Boolean(sender.address),
      required: true,
      detail: !mail.smtp ? "No mail server (SMTP_HOST)." : !sender.address ? "No From address (EMAIL_FROM)." : mail.mode !== "live" ? `Mode is "${mail.mode}": customers get no emails (EMAIL_MODE=live).` : `Sending as ${sender.from}.`,
      fix: { href: "/admin/emails", label: "Emails (and SMTP_*, EMAIL_FROM, EMAIL_MODE)" },
    },
    {
      id: "domain",
      group: "Infrastructure",
      title: "Domain set",
      ok: url.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(url),
      required: true,
      detail: url,
      fix: { label: "NEXT_PUBLIC_SITE_URL (https)" },
    },
    {
      id: "database",
      group: "Infrastructure",
      title: "Production database",
      ok: env("DATABASE_URL"),
      required: true,
      detail: env("DATABASE_URL") ? "PostgreSQL (DATABASE_URL)." : "Embedded local database: development only.",
      fix: { label: "DATABASE_URL (PostgreSQL); see docs/deploy.md" },
    },
    {
      id: "secrets",
      group: "Security",
      title: "Server secrets set",
      ok: env("IP_HASH_SALT") && env("FULFILLMENT_KEY"),
      required: true,
      detail: [`IP_HASH_SALT ${env("IP_HASH_SALT") ? "set" : "missing"}`, `FULFILLMENT_KEY ${env("FULFILLMENT_KEY") ? "set" : "missing"}`].join(" · "),
      fix: { label: "Generate both; see docs/deploy.md" },
    },
    {
      id: "2fa",
      group: "Security",
      title: "Two-factor sign-in for admins",
      ok: require2fa() && owners.every((o) => Boolean(o.totp)),
      required: false,
      detail: !require2fa() ? "Optional now (ADMIN_REQUIRE_2FA is not 1)." : owners.filter((o) => !o.totp).length ? `Owners without 2FA: ${owners.filter((o) => !o.totp).map((o) => o.email).join(", ")}.` : "Required, and every owner has it.",
      fix: { href: "/admin/settings", label: "Settings (and ADMIN_REQUIRE_2FA=1)" },
    },
    {
      id: "bootstrap",
      group: "Security",
      title: "First-admin password removed",
      ok: !env("ADMIN_BOOTSTRAP_PASSWORD"),
      required: false,
      detail: env("ADMIN_BOOTSTRAP_PASSWORD") ? "ADMIN_BOOTSTRAP_PASSWORD is still set. Remove it after the first sign-in." : "Not set.",
      fix: { label: "Unset ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD" },
    },
    {
      id: "indexing",
      group: "Infrastructure",
      title: "Search engines allowed",
      ok: indexable,
      required: false,
      detail: indexable ? "Indexing on, sitemap published." : "Off: the site asks search engines not to index it.",
      fix: { label: "Remove NEXT_PUBLIC_INDEXABLE=false" },
    },
  ];
}

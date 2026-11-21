import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { commerce, editionContents, editions, game, platforms, productId } from "@/config/product";
import * as s from "@/db/schema";
import type { Catalog } from "@/lib/catalog";
import { checkoutIsPreview, checkoutOpen } from "@/lib/checkout";
import type { OfferedMethod } from "@/lib/orders/methods";
import { methodRank, supports, type AssetId, type NetworkId } from "@/config/payments";
import { getDb } from "./db";

const PRODUCT_ID = productId;

/**
 * The methods checkout may offer now: live checkout needs a validated live address; local preview
 * uses enabled test methods (sample addresses, never payable). Same rule as order creation.
 */
function offered(rows: { asset: string; network: string; address: string; validated: boolean; isTest: boolean }[]): OfferedMethod[] {
  return rows
    .filter((r) => supports(r.asset, r.network))
    .filter((r) => (checkoutOpen ? r.validated && !r.isTest && Boolean(r.address) : checkoutIsPreview && r.isTest))
    .map((r) => ({ asset: r.asset as AssetId, network: r.network as NetworkId }))
    .sort((a, b) => methodRank(a.asset, a.network) - methodRank(b.asset, b.network));
}

/** The seed catalogue from config/product.ts (a new database starts from this; also the fallback). */
export function seedCatalog(): Catalog {
  return {
    product: { title: game.title, shortTitle: game.shortTitle },
    currency: commerce.currency,
    editions: editions.map((e) => ({ id: e.id, name: e.name, summary: e.summary, shortSummary: e.shortSummary ?? "", recommended: Boolean(e.recommended) })),
    platforms: platforms.filter((p) => p.verified).map((p) => ({ id: p.id, name: p.name, shortName: p.shortName, available: p.available, redeem: p.redeem ?? { label: "", url: "", steps: [] } })),
    prices: Object.fromEntries(editions.flatMap((e) => platforms.map((p) => [`${e.id}:${p.id}`, e.prices[p.id]?.amount ?? null]))),
    methods: [],
    contents: editionContents.verified ? editionContents.categories.map((c) => ({ label: c.label, items: c.items.map((i) => ({ name: i.name, in: [...i.in] })) })) : [],
    names: {
      editions: Object.fromEntries(editions.map((e) => [e.id, e.name])),
      platforms: Object.fromEntries(platforms.map((p) => [p.id, p.name])),
      platformShort: Object.fromEntries(platforms.map((p) => [p.id, p.shortName])),
    },
  };
}

/**
 * The live catalogue from the database (Admin → Catalogue), once per request. Falls back to the
 * seed when the database is unavailable (e.g. during `next build`), so the storefront renders.
 */
export const getCatalog = cache(async (): Promise<Catalog> => {
  try {
    const db = await getDb();
    const [product] = await db.select().from(s.products).where(eq(s.products.id, PRODUCT_ID));
    const [editionRows, platformRows, priceRows, itemRows, methodRows] = await Promise.all([
      db.select().from(s.editions).orderBy(asc(s.editions.sort), asc(s.editions.createdAt)),
      db.select().from(s.platforms).orderBy(asc(s.platforms.sort), asc(s.platforms.id)),
      db.select().from(s.prices),
      db.select().from(s.editionItems).where(eq(s.editionItems.productId, PRODUCT_ID)).orderBy(asc(s.editionItems.sort), asc(s.editionItems.createdAt)),
      db.select().from(s.paymentMethods).where(eq(s.paymentMethods.active, true)),
    ]);
    if (!product || !editionRows.length) return seedCatalog();

    const active = editionRows.filter((e) => e.active);
    const activeIds = new Set(active.map((e) => e.id));
    // Categories in the order their first item appears.
    const contents: Catalog["contents"] = [];
    for (const item of itemRows) {
      const inActive = item.editionIds.filter((id) => activeIds.has(id));
      let cat = contents.find((c) => c.label === item.category);
      if (!cat) contents.push((cat = { label: item.category, items: [] }));
      cat.items.push({ name: item.name, in: inActive });
    }

    return {
      product: { title: product.title, shortTitle: product.shortTitle || product.title },
      currency: commerce.currency,
      editions: active.map((e) => ({ id: e.id, name: e.name, summary: e.summary, shortSummary: e.shortSummary, recommended: e.recommended })),
      platforms: platformRows.map((p) => ({
        id: p.id,
        name: p.name,
        shortName: p.shortName || p.name,
        available: p.active,
        redeem: { label: p.redeemLabel, url: p.redeemUrl, steps: p.redeemSteps },
      })),
      prices: Object.fromEntries(priceRows.map((r) => [`${r.editionId}:${r.platformId}`, r.active ? r.amountCents : null])),
      contents,
      methods: offered(methodRows),
      names: {
        editions: Object.fromEntries(editionRows.map((e) => [e.id, e.name])),
        platforms: Object.fromEntries(platformRows.map((p) => [p.id, p.name])),
        platformShort: Object.fromEntries(platformRows.map((p) => [p.id, p.shortName || p.name])),
      },
    };
  } catch (err) {
    if (process.env.NEXT_PHASE !== "phase-production-build") console.error("[catalog] falling back to the seed catalogue", err);
    return seedCatalog();
  }
});

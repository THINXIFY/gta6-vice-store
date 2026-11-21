import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { homeBlocks } from "@/brand/home";
import { startingMethods } from "@/brand/payments";
import { editionContents, editions as editionConfig, game, platforms as platformConfig, productId } from "@/config/product";
import * as schema from "@/db/schema";
import { sampleAddress } from "@/lib/orders/methods";
import type { Db } from "./db";

/**
 * Idempotent catalogue seed from config/product.ts (this client's starting catalogue).
 * Existing rows are never overwritten, so everything changed later in Admin → Catalogue
 * (names, prices, wallets) stays authoritative; empty fields added by a migration are filled in
 * once. Edition contents are seeded only while the product has none. Payment methods are seeded
 * as TEST methods with sample addresses only (the client starting list, src/brand/payments.ts);
 * real wallets are entered in Admin → Wallets and never seeded from code.
 */
export async function seed(db: Db) {
  await db.insert(schema.products).values({ id: productId, title: game.title, shortTitle: game.shortTitle }).onConflictDoNothing();
  await db.update(schema.products).set({ shortTitle: game.shortTitle }).where(and(eq(schema.products.id, productId), eq(schema.products.shortTitle, "")));

  await db
    .insert(schema.editions)
    .values(
      editionConfig.map((e, i) => ({
        id: e.id,
        productId,
        name: e.name,
        summary: e.summary,
        shortSummary: e.shortSummary ?? "",
        recommended: Boolean(e.recommended),
        sort: i,
      })),
    )
    .onConflictDoNothing();
  // Rows created before WL-2 have empty descriptive fields: fill them once from config.
  for (const [i, e] of editionConfig.entries()) {
    await db
      .update(schema.editions)
      .set({ summary: e.summary, shortSummary: e.shortSummary ?? "", recommended: Boolean(e.recommended), sort: i })
      .where(and(eq(schema.editions.id, e.id), eq(schema.editions.summary, ""), eq(schema.editions.shortSummary, "")));
  }

  await db
    .insert(schema.platforms)
    .values(
      platformConfig.map((p, i) => ({
        id: p.id,
        name: p.name,
        shortName: p.shortName,
        sort: i,
        redeemLabel: p.redeem?.label ?? "",
        redeemUrl: p.redeem?.url ?? "",
        redeemSteps: p.redeem?.steps ?? [],
        active: p.available,
      })),
    )
    .onConflictDoNothing();
  for (const [i, p] of platformConfig.entries()) {
    await db
      .update(schema.platforms)
      .set({ shortName: p.shortName, sort: i, redeemLabel: p.redeem?.label ?? "", redeemUrl: p.redeem?.url ?? "", redeemSteps: p.redeem?.steps ?? [] })
      .where(and(eq(schema.platforms.id, p.id), eq(schema.platforms.shortName, "")));
  }

  const priceRows = editionConfig.flatMap((e) =>
    platformConfig.flatMap((p) => {
      const price = e.prices[p.id];
      return price?.amount ? [{ editionId: e.id, platformId: p.id, amountCents: price.amount, currency: price.currency }] : [];
    }),
  );
  if (priceRows.length) await db.insert(schema.prices).values(priceRows).onConflictDoNothing();

  if (editionContents.verified) {
    const [{ n }] = (await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.editionItems)
      .where(eq(schema.editionItems.productId, productId))) as [{ n: number }];
    if (n === 0) {
      let sort = 0;
      const rows = editionContents.categories.flatMap((c) => c.items.map((i) => ({ productId, category: c.label, name: i.name, editionIds: [...i.in], sort: sort++ })));
      if (rows.length) await db.insert(schema.editionItems).values(rows);
    }
  }

  // Home page layout (WL-3): the client default; Admin → Homepage changes win afterwards.
  await db
    .insert(schema.homeBlocks)
    .values(homeBlocks.map((b, i) => ({ id: b.id, enabled: b.enabled, sort: i, navLabel: b.nav })))
    .onConflictDoNothing();

  await db
    .insert(schema.paymentMethods)
    .values(startingMethods.map((m) => ({ asset: m.asset, network: m.network, address: sampleAddress(m.asset, m.network), validated: false, isTest: true })))
    .onConflictDoNothing();
}

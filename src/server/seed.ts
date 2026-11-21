import "server-only";
import { assets } from "@/config/payments";
import { editions as editionConfig, game, platforms as platformConfig } from "@/config/product";
import * as schema from "@/db/schema";
import { receivingAddress } from "@/lib/orders/methods";
import type { Db } from "./db";

/**
 * Idempotent catalogue seed from config. Existing rows are never overwritten, so prices and
 * wallets changed later (by an admin) stay authoritative. Payment methods are seeded as TEST
 * methods with sample addresses only; real wallets are never seeded from code.
 */
export async function seed(db: Db) {
  await db.insert(schema.products).values({ id: "gta-vi", title: game.title }).onConflictDoNothing();
  await db
    .insert(schema.editions)
    .values(editionConfig.map((e) => ({ id: e.id, productId: "gta-vi", name: e.name })))
    .onConflictDoNothing();
  await db
    .insert(schema.platforms)
    .values(platformConfig.map((p) => ({ id: p.id, name: p.name, active: p.available })))
    .onConflictDoNothing();
  const priceRows = editionConfig.flatMap((e) =>
    platformConfig.flatMap((p) => {
      const price = e.prices[p.id];
      return price.amount ? [{ editionId: e.id, platformId: p.id, amountCents: price.amount, currency: price.currency }] : [];
    }),
  );
  if (priceRows.length) await db.insert(schema.prices).values(priceRows).onConflictDoNothing();
  await db
    .insert(schema.paymentMethods)
    .values(
      assets.flatMap((a) =>
        a.networks.map((n) => ({ asset: a.id, network: n.network, address: receivingAddress(a.id, n.network), validated: false, isTest: true })),
      ),
    )
    .onConflictDoNothing();
}

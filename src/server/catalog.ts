import "server-only";
import * as s from "@/db/schema";
import { editions, platforms } from "@/config/product";
import type { Catalog } from "@/lib/catalog";
import { getDb } from "./db";

/**
 * Live prices and platform availability from the database (managed in /admin/pricing).
 * Falls back to config defaults if the database is unavailable, so the storefront renders.
 */
export async function getCatalog(): Promise<Catalog> {
  const fallback: Catalog = {
    prices: Object.fromEntries(editions.flatMap((e) => platforms.map((p) => [`${e.id}:${p.id}`, e.prices[p.id].amount]))),
    platforms: Object.fromEntries(platforms.map((p) => [p.id, p.available])),
  };
  try {
    const db = await getDb();
    const [priceRows, platformRows] = await Promise.all([db.select().from(s.prices), db.select().from(s.platforms)]);
    return {
      prices: { ...fallback.prices, ...Object.fromEntries(priceRows.map((r) => [`${r.editionId}:${r.platformId}`, r.active ? r.amountCents : null])) },
      platforms: { ...fallback.platforms, ...Object.fromEntries(platformRows.map((r) => [r.id, r.active])) },
    };
  } catch (err) {
    console.error("[catalog] falling back to config", err);
    return fallback;
  }
}

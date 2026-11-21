import { editions as editionConfig, platforms as platformConfig } from "@/config/product";
import type { Edition, EditionId, Platform, PlatformId, Price } from "@/config/types";

/** Serializable price + availability snapshot passed from the server to client components. */
export type Catalog = {
  /** `${edition}:${platform}` → cents, or null when not on sale. */
  prices: Record<string, number | null>;
  platforms: Record<string, boolean>;
};

const CURRENCY = "USD";

/** Editions with prices taken from the catalog. */
export function pricedEditions(catalog: Catalog): Edition[] {
  return editionConfig.map((e) => ({
    ...e,
    prices: Object.fromEntries(platformConfig.map((p) => [p.id, { amount: catalog.prices[`${e.id}:${p.id}`] ?? null, currency: CURRENCY } satisfies Price])) as Record<PlatformId, Price>,
  }));
}

/** Platforms with availability taken from the catalog (verified only). */
export function catalogPlatforms(catalog: Catalog): Platform[] {
  return platformConfig.filter((p) => p.verified).map((p) => ({ ...p, available: catalog.platforms[p.id] ?? p.available }));
}

export function catalogPrice(catalog: Catalog, edition: EditionId, platform: PlatformId): Price {
  return { amount: catalog.prices[`${edition}:${platform}`] ?? null, currency: CURRENCY };
}

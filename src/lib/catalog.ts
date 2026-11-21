import type { Edition, EditionId, Platform, PlatformId, Price, Redeem } from "@/config/types";
import type { OfferedMethod } from "@/lib/orders/methods";

/**
 * The store's catalogue: a serializable snapshot read from the database on the server
 * (src/server/catalog.ts, managed in Admin → Catalogue) and passed to client components
 * through <CatalogProvider> (layout) or props. Only active editions are listed; platforms
 * that are switched off stay listed with `available: false`.
 */
export type CatalogEdition = { id: EditionId; name: string; summary: string; shortSummary: string; recommended: boolean };
export type CatalogPlatform = { id: PlatformId; name: string; shortName: string; available: boolean; redeem: Redeem };
export type CatalogCategory = { label: string; items: { name: string; in: EditionId[] }[] };

export type Catalog = {
  product: { title: string; shortTitle: string };
  currency: string;
  /** Sorted for display. */
  editions: CatalogEdition[];
  /** Sorted for display. */
  platforms: CatalogPlatform[];
  /** `${edition}:${platform}` → cents, or null when not on sale. */
  prices: Record<string, number | null>;
  /** What each edition includes, grouped by category in display order. Empty = not shown. */
  contents: CatalogCategory[];
  /** Payment methods offered right now (Admin → Wallets): enabled, and validated with a live address for live checkout. */
  methods: OfferedMethod[];
  /** Names for every edition and platform id ever sold, including hidden ones (orders, admin). */
  names: { editions: Record<string, string>; platforms: Record<string, string>; platformShort: Record<string, string> };
};

/** Editions with prices taken from the catalogue. */
export function pricedEditions(catalog: Catalog): Edition[] {
  return catalog.editions.map((e) => ({
    ...e,
    prices: Object.fromEntries(catalog.platforms.map((p) => [p.id, catalogPrice(catalog, e.id, p.id)])),
  }));
}

/** Platforms with their availability. */
export function catalogPlatforms(catalog: Catalog): Platform[] {
  return catalog.platforms.map((p) => ({ ...p, verified: true }));
}

export function catalogPrice(catalog: Catalog, edition: EditionId, platform: PlatformId): Price {
  return { amount: catalog.prices[`${edition}:${platform}`] ?? null, currency: catalog.currency };
}

/** Every item across categories. */
export const allItems = (catalog: Catalog) => catalog.contents.flatMap((c) => c.items);

/** Number of items each edition includes. */
export function itemCount(catalog: Catalog, edition: EditionId) {
  return allItems(catalog).filter((i) => i.in.includes(edition)).length;
}

/** Editions from most to least complete (comparison order: the fullest edition first). */
export function byCompleteness(catalog: Catalog, editions: Edition[]): Edition[] {
  return [...editions].sort((a, b) => itemCount(catalog, b.id) - itemCount(catalog, a.id));
}

/** Lowest price on sale across editions and available platforms, for "from $X". */
export function lowestCents(catalog: Catalog): number | null {
  const available = new Set(catalog.platforms.filter((p) => p.available).map((p) => p.id));
  const cents = Object.entries(catalog.prices)
    .filter(([k, v]) => typeof v === "number" && v > 0 && available.has(k.split(":")[1]!))
    .map(([, v]) => v as number);
  return cents.length ? Math.min(...cents) : null;
}

export const editionName = (catalog: Catalog, id: string) => catalog.names.editions[id] ?? id;
export const platformName = (catalog: Catalog, id: string) => catalog.names.platforms[id] ?? id;
export const platformShortName = (catalog: Catalog, id: string) => catalog.names.platformShort[id] ?? platformName(catalog, id);

/**
 * One factual line comparing the base edition (fewest items) with the fullest, e.g. "Standard
 * Edition is the full game. Ultimate Edition adds 16 extras." Null when there is nothing to compare.
 */
export function editionsLine(catalog: Catalog): { text: string; extras: number } | null {
  const ranked = [...catalog.editions].sort((a, b) => itemCount(catalog, a.id) - itemCount(catalog, b.id));
  const base = ranked[0];
  const top = ranked.at(-1);
  if (!base || !top || base.id === top.id) return null;
  const extras = itemCount(catalog, top.id) - itemCount(catalog, base.id);
  if (extras <= 0) return null;
  const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const baseText = base.shortSummary ? `${base.name} is ${lower(base.shortSummary)}.` : `${base.name} is the starting point.`;
  return { text: `${baseText} ${top.name} adds ${extras} extras.`, extras };
}

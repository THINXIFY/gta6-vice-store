import { editions } from "@/config/product";
import type { EditionId, PlatformId, Price } from "@/config/types";
import { site } from "@/config/site";

export function getPrice(edition: EditionId, platform: PlatformId): Price | undefined {
  return editions.find((e) => e.id === edition)?.prices[platform];
}

/** Returns a display string, or `null` when the price is not confirmed. */
export function formatPrice(price: Price | undefined): string | null {
  if (!price || price.amount === null) return null;
  return new Intl.NumberFormat(site.locale, { style: "currency", currency: price.currency }).format(price.amount / 100);
}

/** Lowest confirmed price for a platform, for "from $X" messaging. */
export function lowestPrice(platform: PlatformId): Price | undefined {
  return editions
    .map((e) => e.prices[platform])
    .filter((p) => p.amount !== null)
    .sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0))[0];
}

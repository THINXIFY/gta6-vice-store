import type { Price } from "@/config/types";
import { site } from "@/config/site";

/** Returns a display string, or `null` when the price is not confirmed. */
export function formatPrice(price: Price | undefined): string | null {
  if (!price || price.amount === null) return null;
  return new Intl.NumberFormat(site.locale, { style: "currency", currency: price.currency }).format(price.amount / 100);
}

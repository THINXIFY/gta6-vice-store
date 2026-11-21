import type { Price as PriceValue } from "@/config/types";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/** Renders a confirmed price, or an honest placeholder when none is set. */
export function Price({ price, className }: { price: PriceValue | undefined; className?: string }) {
  const label = formatPrice(price);
  return label ? (
    <span className={cn("tabular-nums", className)}>{label}</span>
  ) : (
    <span className={cn("text-warm/56", className)}>Price to be announced</span>
  );
}

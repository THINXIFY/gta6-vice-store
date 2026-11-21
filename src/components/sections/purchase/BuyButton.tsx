"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { checkoutAvailable } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { usePurchase } from "./PurchaseContext";

const base = "group inline-flex items-center justify-center gap-2.5 rounded-control font-semibold whitespace-nowrap transition-[background-position,transform] duration-500 ease-swift";

/**
 * Purchase action. Links to /checkout with the current selection when checkout is
 * available (live, or local preview); otherwise an inert, explained button.
 */
export function BuyButton({ label, describedBy, className }: { label: string; describedBy?: string; className?: string }) {
  const { editionId, platformId } = usePurchase();

  if (checkoutAvailable) {
    return (
      <Link
        href={`/checkout?edition=${editionId}&platform=${platformId}`}
        aria-describedby={describedBy}
        className={cn(
          base,
          "bg-[linear-gradient(100deg,var(--color-vice)_0%,#ff7a7c_45%,var(--color-sunset)_100%)] bg-[length:140%_100%] bg-left text-obsidian hover:bg-right active:scale-[0.98]",
          className,
        )}
      >
        {label}
        <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    );
  }

  return (
    <button type="button" disabled aria-describedby={describedBy} className={cn(base, "cursor-not-allowed border border-warm/14 bg-warm/[0.04] text-warm/60", className)}>
      <Lock aria-hidden className="size-4" strokeWidth={2.25} />
      {label}
    </button>
  );
}

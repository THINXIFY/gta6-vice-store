"use client";

import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import type { MouseEvent } from "react";
import { getLenis, scrollToHash } from "@/components/motion/SmoothScroll";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import { closingCopy } from "@/config/content";
import { closingBackdrop } from "@/config/media";
import { isUsable } from "@/lib/media";
import { site } from "@/config/site";
import { HeroParticles } from "../hero/HeroParticles";
import { usePurchase } from "./PurchaseContext";

/**
 * Compact hand-off from the media back to purchasing. Echoes the current selection so
 * the visitor resumes where they left off. No urgency, no claims.
 */
export function ClosingCta() {
  const { edition, platform } = usePurchase();

  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    getLenis()?.start();
    scrollToHash(site.purchaseHref);
  };

  return (
    <section data-closing-cta aria-labelledby="closing-title" className="relative isolate overflow-hidden border-t border-warm/8 bg-obsidian">
      {isUsable(closingBackdrop) && (
        <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
          <div data-scrub-zoom className="absolute inset-0 will-change-transform">
            <Image src={closingBackdrop.src} alt="" fill sizes="100vw" className="object-cover object-[50%_60%] opacity-70" />
          </div>
          <div className="absolute inset-0 bg-linear-to-r from-obsidian via-obsidian/70 to-obsidian/20" />
          <div className="absolute inset-0 bg-linear-to-t from-obsidian via-transparent to-obsidian/60" />
        </div>
      )}
      <div aria-hidden className="bg-sunset-glow pointer-events-none absolute inset-0 -z-10 opacity-60" />
      {/* The hero's neon motes return, sparser, to close the page on the same night. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <HeroParticles className="size-full" density={22000} max={60} />
      </div>
      <Container className="flex flex-col gap-8 py-[clamp(5rem,3rem+9vw,12rem)] md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="closing-title" data-reveal-heading className="font-display text-display-lg font-extrabold tracking-[-0.005em]">{closingCopy.heading}</h2>
          <p className="mt-4 max-w-[30rem] text-warm/70">{closingCopy.body}</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <Button href={site.purchaseHref} onClick={go} variant="sunset" size="lg" className="px-9 max-md:w-full">
            <ShoppingBag aria-hidden className="size-4.5" strokeWidth={2.25} />
            {closingCopy.cta}
          </Button>
          <p className="text-sm text-warm/60 max-md:text-center">
            Your selection: {edition.name} for {platform.name}
          </p>
        </div>
      </Container>
    </section>
  );
}

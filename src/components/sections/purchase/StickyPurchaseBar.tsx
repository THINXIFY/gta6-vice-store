"use client";

import { useEffect, useState } from "react";
import { getLenis, scrollToHash } from "@/components/motion/SmoothScroll";
import { Container } from "@/components/ui/Layout";
import { Price } from "@/components/ui/Price";
import { cn } from "@/lib/utils";
import { BuyButton } from "./BuyButton";
import { EditionArt } from "./EditionArt";
import { usePurchase } from "./PurchaseContext";

/**
 * Appears once the hero has scrolled away; hides while the main purchase controls
 * are substantially on screen and when the footer is reached, so it never sits on
 * top of the controls it duplicates or the legal text.
 */
function useBarVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("overview");
    const panel = document.getElementById("purchase-panel");
    const footer = document.querySelector("[data-closing-cta]") ?? document.querySelector("footer");
    let frame = 0;
    const measure = () => {
      const vh = window.innerHeight;
      const pastHero = hero ? hero.getBoundingClientRect().bottom < vh * 0.25 : true;
      let panelShown = false;
      if (panel) {
        const r = panel.getBoundingClientRect();
        const onScreen = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        panelShown = onScreen > Math.min(r.height, vh) * 0.35;
      }
      const atFooter = footer ? footer.getBoundingClientRect().top < vh : false;
      setVisible(pastHero && !panelShown && !atFooter);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return visible;
}

export function StickyPurchaseBar() {
  const visible = useBarVisible();
  const { edition, editionId, platform, platformId, price } = usePurchase();

  const review = () => {
    getLenis()?.start();
    scrollToHash("#editions");
  };

  return (
    <aside
      aria-label="Your selection"
      data-sticky-purchase
      data-visible={visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-warm/10 bg-midnight pb-[env(safe-area-inset-bottom)] transition-[translate,opacity] duration-500 ease-cinematic",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <Container className="flex h-[4.5rem] items-center gap-4 lg:h-20">
        <div aria-hidden className="relative hidden h-12 w-16 shrink-0 overflow-hidden rounded-lg sm:block">
          <EditionArt edition={editionId} platform={platformId} sizes="4rem" />
        </div>
        <button type="button" onClick={review} className="min-w-0 flex-1 text-left" aria-label={`${edition.name} for ${platform.name}. Change selection`}>
          <span className="block truncate text-sm font-semibold sm:text-base">{edition.name}</span>
          <span className="block truncate text-xs text-warm/60 sm:text-sm">
            {platform.shortName}
            <span className={cn(price?.amount == null && "max-sm:hidden")}> &ndash; <Price price={price} className="text-warm/60" /></span>
            <span className="ml-2 text-sunset underline-offset-4 hover:underline">Change</span>
          </span>
        </button>
        <BuyButton label="Buy now" describedBy="checkout-status" className="h-11 shrink-0 px-5 text-sm lg:h-12 lg:px-7" />
      </Container>
    </aside>
  );
}

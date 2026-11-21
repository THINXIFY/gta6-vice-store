"use client";

import type { ReactNode } from "react";
import { gsap } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

/**
 * Page-wide scroll language shared by every section below the hero (opt-in by attribute):
 * - `[data-glow]`: neon blooms drift at their own depth (value = speed).
 * - `[data-reveal-heading]`: section headings rise through a mask once, as they enter.
 * - `[data-neon-rule]`: horizon lines draw outward from the centre, scrubbed.
 * - `[data-scrub-zoom]`: media settles from a slight push-in while passing through.
 * - `[data-footer-mark]`: the closing wordmark tightens and lifts into place.
 * - a hairline scroll-progress bar.
 * Sections keep their own single orchestrated moment; this only adds atmosphere and
 * consistent heading entrances. Skipped under reduced motion; without JS everything is static.
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope }) => {
    const all = (sel: string) => Array.from(scope.querySelectorAll<HTMLElement>(sel));

    gsap.fromTo(
      "[data-scroll-progress]",
      { scaleX: 0 },
      { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.3 } },
    );

    for (const glow of all("[data-glow]")) {
      const travel = Number(glow.dataset.glow || 0.4) * 260;
      const section = glow.closest("section, footer") ?? glow.parentElement!;
      gsap.fromTo(glow, { y: travel / 2 }, { y: -travel / 2, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true } });
    }

    for (const heading of all("[data-reveal-heading]")) {
      gsap.fromTo(
        heading,
        { y: 56, clipPath: "inset(0% 0% 100% 0%)" },
        {
          y: 0,
          clipPath: "inset(-20% -5% -20% -5%)",
          duration: 1.3,
          ease: "expo.out",
          clearProps: "clipPath",
          scrollTrigger: { trigger: heading, start: "top 90%", once: true },
        },
      );
    }

    for (const rule of all("[data-neon-rule]")) {
      gsap.fromTo(rule, { scaleX: 0, opacity: 0.2 }, { scaleX: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: rule, start: "top 98%", end: "top 55%", scrub: 0.6 } });
    }

    for (const media of all("[data-scrub-zoom]")) {
      gsap.fromTo(media, { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: media.parentElement ?? media, start: "top bottom", end: "center center", scrub: true } });
    }

    const mark = scope.querySelector("[data-footer-mark]");
    if (mark) {
      gsap.fromTo(
        mark,
        { letterSpacing: "0.08em", yPercent: 22, opacity: 0.4 },
        { letterSpacing: "-0.01em", yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: mark, start: "top bottom", end: "bottom bottom", scrub: 0.6 } },
      );
    }
  });

  return (
    <div ref={ref}>
      <div aria-hidden data-scroll-progress className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-linear-to-r from-vice via-lavender to-sunset shadow-[0_0_12px_color-mix(in_oklab,var(--color-vice)_60%,transparent)]" />
      {children}
    </div>
  );
}

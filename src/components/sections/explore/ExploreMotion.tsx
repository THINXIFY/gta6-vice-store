"use client";

import type { ReactNode } from "react";
import { gsap } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

/**
 * Explore's orchestrated moment, scrubbed to scroll:
 * 1. LEONIDA's letters rise into place one after another;
 * 2. the street scene opens from a rounded, zoomed-in frame to full bleed,
 *    sliding over the title while the image settles from a deep zoom;
 * 3. the "Vice City" caption lands as the frame completes.
 * The night portrait drifts gently. Reduced motion / no JS = final static layout.
 */
export function ExploreMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope }) => {
    const frame = scope.querySelector("[data-world-frame]");
    const title = scope.querySelector("[data-world-title]");
    if (!frame || !title) return;

    gsap.fromTo(
      title.querySelectorAll("[data-letter]"),
      { yPercent: 55, opacity: 0 },
      { yPercent: 0, opacity: 1, ease: "power2.out", stagger: 0.08, scrollTrigger: { trigger: title, start: "top 92%", end: "top 45%", scrub: 0.6 } },
    );
    gsap.fromTo("[data-world-kicker]", { y: 24, opacity: 0 }, { y: 0, opacity: 1, scrollTrigger: { trigger: title, start: "top 95%", end: "top 70%", scrub: 0.6 } });

    const open = gsap.timeline({ scrollTrigger: { trigger: frame, start: "top 95%", end: "top 12%", scrub: 0.8 } });
    open
      .fromTo(frame, { clipPath: "inset(10% 12% 0% 12% round 2.5rem)" }, { clipPath: "inset(0% 0% 0% 0% round 0rem)", ease: "none" }, 0)
      .fromTo("[data-world-image]", { scale: 1.45 }, { scale: 1, ease: "none" }, 0)
      .fromTo(title, { yPercent: 0 }, { yPercent: -12, ease: "none" }, 0)
      .fromTo("[data-world-caption] > *", { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, ease: "power2.out", duration: 0.35 }, 0.62);

    const night = scope.querySelector("[data-world-night]");
    if (night) {
      gsap.fromTo(night, { y: 60 }, { y: -40, ease: "none", scrollTrigger: { trigger: night, start: "top bottom", end: "bottom top", scrub: true } });
    }
  });

  return <div ref={ref}>{children}</div>;
}

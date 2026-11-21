"use client";

import type { ReactNode } from "react";
import { gsap } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

/**
 * The section's single moment, scrubbed: Jason's and Lucia's slices start apart and
 * offset, then close into one frame as the pair reaches the middle of the screen.
 * Bios rise in alongside. Final state = static layout (reduced motion / no JS).
 */
export function CharactersMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope, conditions }) => {
    const jason = scope.querySelector("[data-slice=jason]");
    const lucia = scope.querySelector("[data-slice=lucia]");
    if (!jason || !lucia) return;
    const apart = conditions.desktop ? 14 : 8;
    const trigger = jason.parentElement!;
    const scrollTrigger = { trigger, start: "top 85%", end: "center 55%", scrub: true };

    gsap.fromTo(jason, { xPercent: -apart, yPercent: -5, filter: "brightness(0.55)" }, { xPercent: 0, yPercent: 0, filter: "brightness(1)", ease: "none", scrollTrigger });
    gsap.fromTo(lucia, { xPercent: apart, yPercent: 5, filter: "brightness(0.55)" }, { xPercent: 0, yPercent: 0, filter: "brightness(1)", ease: "none", scrollTrigger });
    gsap.from("[data-bio]", { autoAlpha: 0, y: 32, stagger: 0.12, scrollTrigger: { trigger, start: "top 70%", once: true } });
  });

  return <div ref={ref}>{children}</div>;
}

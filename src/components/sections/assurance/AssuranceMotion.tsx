"use client";

import type { ReactNode } from "react";
import { gsap } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

/** One moment: the cards rise in sequence as their tonal hairlines draw across. */
export function AssuranceMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope }) => {
    const cards = scope.querySelectorAll("[data-card]");
    if (!cards.length) return;
    gsap
      .timeline({ scrollTrigger: { trigger: cards[0], start: "top 85%", once: true } })
      .from(cards, { y: 48, autoAlpha: 0, duration: 1, stagger: 0.12, ease: "expo.out", clearProps: "transform,opacity,visibility" })
      .from(scope.querySelectorAll("[data-card-line]"), { scaleX: 0, duration: 1.2, stagger: 0.12, ease: "expo.inOut" }, 0.15);
  });
  return <div ref={ref}>{children}</div>;
}

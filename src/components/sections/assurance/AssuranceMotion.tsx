"use client";

import type { ReactNode } from "react";
import { gsap } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

/** One moment: step numbers rise in sequence while their connectors draw toward the next step. */
export function AssuranceMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope }) => {
    const steps = scope.querySelectorAll("[data-step]");
    if (!steps.length) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: steps[0], start: "top 80%", once: true } });
    tl.from(scope.querySelectorAll("[data-step-number]"), { yPercent: 60, autoAlpha: 0, duration: 0.9, stagger: 0.25, ease: "expo.out" })
      .from(scope.querySelectorAll("[data-step-line]"), { scaleX: 0, scaleY: 0, duration: 1.1, stagger: 0.25, ease: "expo.inOut" }, 0.15)
      .from(scope.querySelectorAll("[data-step] h3, [data-step] p"), { y: 16, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: "expo.out" }, 0.2);
  });
  return <div ref={ref}>{children}</div>;
}

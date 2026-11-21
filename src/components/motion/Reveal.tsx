"use client";

import type { ReactNode } from "react";
import { useGsap } from "@/lib/motion/useGsap";
import { maskReveal, rise } from "@/lib/motion/presets";

type RevealProps = {
  children: ReactNode;
  /** "rise" staggers direct children in; "mask" wipes the whole block in. */
  variant?: "rise" | "mask";
  className?: string;
};

/**
 * Scroll-triggered entrance for below-the-fold content.
 * Content is fully visible without JS or with reduced motion.
 * Do not use above the fold — the hero owns its own intro sequence.
 */
export function Reveal({ children, variant = "rise", className }: RevealProps) {
  const ref = useGsap<HTMLDivElement>(({ scope }) => {
    if (variant === "mask") maskReveal(scope, scope);
    else rise(scope.children, scope);
  }, [variant]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

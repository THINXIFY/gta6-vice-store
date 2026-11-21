"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Import gsap/ScrollTrigger from here only, so plugins register exactly once. */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "expo.out", duration: 1.1 });
  // Some layers are optional (e.g. the drawn hero's numeral when licensed art is shown).
  gsap.config({ nullTargetWarn: false });
}

/** Media-query conditions for gsap.matchMedia(). */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 64rem)",
} as const;

export { gsap, ScrollTrigger };

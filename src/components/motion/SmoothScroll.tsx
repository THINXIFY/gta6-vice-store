"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, MOTION_QUERIES } from "@/lib/motion/gsap";

let instance: Lenis | null = null;

/** Active Lenis instance, or null when native scrolling is in use (reduced motion). */
export function getLenis(): Lenis | null {
  return instance;
}

/** Scroll to an in-page target, using Lenis when active. */
export function scrollToHash(hash: string) {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return;
  if (instance) instance.scrollTo(target);
  else target.scrollIntoView({ block: "start" });
  history.replaceState(null, "", hash);
}

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Disabled entirely (native scrolling) when the user prefers reduced motion,
 * and reacts if that preference changes mid-session.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return; // native scrolling in the dashboard
    const query = window.matchMedia(MOTION_QUERIES.reduced);
    let teardown: (() => void) | undefined;

    const start = () => {
      // Slightly calmer than the defaults: each wheel step travels 15% less, with a touch more glide.
      // Touch keeps the device’s native scrolling.
      const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.085, wheelMultiplier: 0.85 });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      instance = lenis;
      teardown = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
        instance = null;
      };
    };

    const sync = () => {
      teardown?.();
      teardown = undefined;
      if (!query.matches) start();
    };

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      teardown?.();
    };
  }, []);

  return null;
}

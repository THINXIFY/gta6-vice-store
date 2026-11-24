"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, MOTION_QUERIES } from "@/lib/motion/gsap";

let instance: Lenis | null = null;

/** Active Lenis instance, or null when native scrolling is in use (reduced motion). */
export function getLenis(): Lenis | null {
  return instance;
}

/** The top of the page: reached without a hash, so the address stays clean (vicestoregaming.com, not /#overview). */
const TOP = "#overview";
const cleanUrl = () => history.replaceState(null, "", window.location.pathname + window.location.search);

/** Scroll to an in-page target, using Lenis when active. */
export function scrollToHash(hash: string) {
  if (hash === TOP) {
    // The page top, not the element: the hero is pinned while scrolling, so its box can sit in view mid-page.
    if (instance) instance.scrollTo(0);
    else window.scrollTo({ top: 0 });
    cleanUrl();
    return;
  }
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
    // Opened as /#overview (an old link or browser autocomplete): it is the top of the page anyway.
    if (window.location.hash === TOP) cleanUrl();
    const query = window.matchMedia(MOTION_QUERIES.reduced);
    let teardown: (() => void) | undefined;

    const start = () => {
      // Slightly calmer than the defaults: each wheel step travels 15% less, with a touch more glide.
      // Touch keeps the device’s native scrolling.
      // In-page links are handled below (scrollToHash), so the page top and the address bar stay right.
      const lenis = new Lenis({ autoRaf: false, anchors: false, lerp: 0.085, wheelMultiplier: 0.85 });
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

    /** Same-page `#section` links (footer, hero, cards): smooth travel, clean address for the top. */
    const onClick = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      let exists = url.hash === TOP;
      try {
        exists ||= Boolean(document.querySelector(url.hash));
      } catch {
        return; // not a section link (e.g. #key=… on the order page)
      }
      if (!exists) return;
      event.preventDefault();
      instance?.start();
      scrollToHash(url.hash);
    };

    sync();
    query.addEventListener("change", sync);
    document.addEventListener("click", onClick);
    return () => {
      query.removeEventListener("change", sync);
      document.removeEventListener("click", onClick);
      teardown?.();
    };
  }, []);

  return null;
}

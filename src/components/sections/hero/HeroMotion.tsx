"use client";

import type { ReactNode } from "react";
import { gsap } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

/**
 * The hero's orchestrated opening and ambient life:
 * 1. Intro: the frame settles from a push-in; headline lines rise out of their masks,
 *    the product line tightens into place, then copy and CTAs arrive.
 * 2. Ambient: a very slow, continuous push on the key art (ken burns).
 * 3. Scroll: layers move at different depths, the art eases in, the copy lifts away.
 * 4. Pointer (desktop, fine pointer): layers drift a few pixels by depth.
 * Pre-hydration hiding is handled by `.motion-ok` CSS (globals.css), so nothing flashes.
 * Skipped entirely under reduced motion (useGsap), leaving the static composition.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope, conditions }) => {
    const q = gsap.utils.selector(scope);
    const intro = q("[data-hero-intro]");
    const h1 = q("h1[data-hero-intro]");
    const lines = q("[data-hero-line]");
    const product = q("[data-hero-product]");
    const others = intro.filter((el) => !h1.includes(el));
    const numeral = q('[data-hero-layer="numeral"]');
    const reflection = q('[data-hero-layer="reflection"]');
    const layers = q("[data-depth]") as HTMLElement[];

    gsap.set(others, { autoAlpha: 0, y: 26 });
    gsap.set(h1, { autoAlpha: 1 });
    gsap.set(lines, { yPercent: 112 });
    gsap.set(product, { autoAlpha: 0, letterSpacing: "0.6em" });
    gsap.set(numeral, { y: 420 });
    gsap.set(reflection, { autoAlpha: 0 });
    document.documentElement.classList.add("hero-ready");

    gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .fromTo(q("[data-hero-scene]"), { scale: 1.14 }, { scale: 1, duration: 3.4, ease: "power3.out" }, 0)
      .to(numeral, { y: 0, duration: 2.2 }, 0.2)
      .to(reflection, { autoAlpha: 1, duration: 1.6, ease: "power1.out" }, 0.9)
      .to(others[0] ?? [], { autoAlpha: 1, y: 0, duration: 1 }, 0.35)
      .to(lines, { yPercent: 0, duration: 1.35, stagger: 0.14 }, 0.45)
      .to(product, { autoAlpha: 1, letterSpacing: "0.24em", duration: 1.6, ease: "power3.out" }, 0.85)
      .to(others.slice(1), { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, 1.05);

    // Ambient push on the key art: slow enough to feel like a camera, not an effect.
    gsap.to(q("[data-hero-zoom]"), { scale: 1.07, xPercent: -1.2, duration: 26, ease: "sine.inOut", yoyo: true, repeat: -1 });

    const scroll = { trigger: scope, start: "top top", end: "bottom top", scrub: true };
    for (const layer of layers) {
      gsap.to(layer, {
        yPercent: Number(layer.dataset.depth) * 55,
        ...(layer.dataset.scrollZoom !== undefined && { scale: 1.08 }),
        ease: "none",
        scrollTrigger: scroll,
      });
    }
    gsap.to(q("[data-hero-content]"), { y: -60, autoAlpha: 0, ease: "none", scrollTrigger: { ...scroll, start: "30% top", end: "85% top" } });

    // Pointer drift: desktop + fine pointer only. Moves composited layers by a few px.
    if (!conditions.desktop || !matchMedia("(pointer: fine)").matches) return;
    const movers = layers.map((el) => ({
      x: gsap.quickTo(el, "x", { duration: 1.8, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1.8, ease: "power3.out" }),
      d: Number(el.dataset.depth),
    }));
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      for (const m of movers) {
        m.x(nx * -70 * m.d);
        m.y(ny * -36 * m.d);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  });

  return <div ref={ref}>{children}</div>;
}

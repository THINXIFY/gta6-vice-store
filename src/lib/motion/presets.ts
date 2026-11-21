"use client";

import { gsap } from "./gsap";

/**
 * Reusable motion presets. Call these inside `useGsap` so they are scoped,
 * reverted on unmount and skipped for reduced-motion users.
 * Principle: one orchestrated moment per section, never effects on everything.
 */

type Targets = gsap.TweenTarget;

/** Soft rise-in, triggered once when the element enters the viewport. */
export function rise(targets: Targets, trigger: Element, opts: { stagger?: number; y?: number } = {}) {
  return gsap.from(targets, {
    autoAlpha: 0,
    y: opts.y ?? 32,
    stagger: opts.stagger ?? 0.08,
    scrollTrigger: { trigger, start: "top 82%", once: true },
  });
}

/** Cinematic wipe: reveals an element bottom-up with a clip-path mask. */
export function maskReveal(targets: Targets, trigger: Element) {
  return gsap.fromTo(
    targets,
    { clipPath: "inset(100% 0% 0% 0%)" },
    { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger, start: "top 75%", once: true } },
  );
}

/** Scroll-linked depth. Positive `distance` moves the element up as the page scrolls. */
export function parallax(targets: Targets, trigger: Element, distance = 80) {
  return gsap.fromTo(
    targets,
    { y: distance / 2 },
    { y: -distance / 2, ease: "none", scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: true } },
  );
}

/** Scale-down of a full-bleed media frame as the user scrolls past it. */
export function cinematicZoom(targets: Targets, trigger: Element) {
  return gsap.fromTo(
    targets,
    { scale: 1.12 },
    { scale: 1, ease: "none", scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: true } },
  );
}

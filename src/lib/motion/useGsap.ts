"use client";

import { useEffect, useLayoutEffect, useRef, type DependencyList, type RefObject } from "react";
import { gsap, MOTION_QUERIES } from "./gsap";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Conditions = { [K in keyof typeof MOTION_QUERIES]: boolean };

/**
 * Scoped GSAP setup with automatic cleanup (safe under React Strict Mode).
 * The callback only runs when the user has NOT requested reduced motion;
 * `conditions` exposes breakpoints for responsive timelines.
 * Selector strings inside the callback are scoped to `scope`.
 */
export function useGsap<T extends HTMLElement>(
  setup: (ctx: { scope: T; conditions: Conditions }) => void | (() => void),
  deps: DependencyList = [],
): RefObject<T | null> {
  const scope = useRef<T>(null);

  // `setup` is intentionally read from the render that matches `deps`.
  useIsoLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add(MOTION_QUERIES, (context) => {
      const conditions = context.conditions as Conditions;
      if (!conditions.motion) return;
      return setup({ scope: el, conditions });
    });
    return () => mm.revert();
  }, deps);

  return scope;
}

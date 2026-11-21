"use client";

import type { ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The hero's orchestrated motion (all skipped under reduced motion, leaving the static
 * composition; pre-hydration hiding is handled by `.motion-ok` CSS):
 * 1. Intro: the frame settles from a push-in, headline lines rise, product line tightens.
 * 2. Ambient: very slow ken-burns push on the key art.
 * 3. Scroll, desktop: the hero pins while the camera dollies toward the characters, the copy
 *    lifts away and the scene shifts from dusk to night. Phones: no pin, the same story as
 *    a lighter scroll-linked parallax.
 * 4. Pointer, desktop: depth drift plus a soft spotlight that follows the cursor.
 * 5. Hand-off: the "VI" of the product line travels into the Editions heading.
 * 6. Scroll cue: fills as scrolling starts, then fades.
 * Only transforms and opacity are animated (no filters), to keep interactions fast.
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope, conditions }) => {
    const q = gsap.utils.selector(scope);
    const section = scope.querySelector("section")!;
    const pinEl = scope.querySelector<HTMLElement>("[data-hero-pin]") ?? section;
    const intro = q("[data-hero-intro]");
    const h1 = q("h1[data-hero-intro]");
    const lines = q("[data-hero-line]");
    const product = q("[data-hero-product]");
    const others = intro.filter((el) => !h1.includes(el));
    const numeral = q('[data-hero-layer="numeral"]');
    const reflection = q('[data-hero-layer="reflection"]');
    const layers = q("[data-depth]") as HTMLElement[];
    const [content] = q("[data-hero-content]");
    const [dolly] = q("[data-hero-dolly]");
    const [night] = q("[data-hero-night]");
    const [cue] = q("[data-hero-cue]");
    const [cueFill] = q("[data-hero-cue-fill]");
    const [spot] = q("[data-hero-spot]") as HTMLElement[];

    // ── 1–2. Intro and ambient ────────────────────────────────────────────────
    gsap.set(others, { autoAlpha: 0, y: 26 });
    gsap.set(h1, { autoAlpha: 1 });
    gsap.set(lines, { yPercent: 112 });
    gsap.set(product, { autoAlpha: 0, letterSpacing: "0.6em" });
    gsap.set(numeral, { y: 420 });
    gsap.set(reflection, { autoAlpha: 0 });
    gsap.set(cueFill ?? [], { scaleY: 0 });
    gsap.set(cue ?? [], { autoAlpha: 0 });
    document.documentElement.classList.add("hero-ready");

    gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .fromTo(q("[data-hero-scene]"), { scale: 1.14 }, { scale: 1, duration: 3.4, ease: "power3.out" }, 0)
      .to(numeral, { y: 0, duration: 2.2 }, 0.2)
      .to(reflection, { autoAlpha: 1, duration: 1.6, ease: "power1.out" }, 0.9)
      .to(others[0] ?? [], { autoAlpha: 1, y: 0, duration: 1 }, 0.35)
      .to(lines, { yPercent: 0, duration: 1.35, stagger: 0.14 }, 0.45)
      .to(product, { autoAlpha: 1, letterSpacing: "0.24em", duration: 1.6, ease: "power3.out" }, 0.85)
      .to(others.slice(1), { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, 1.05)
      .to(cue ?? [], { autoAlpha: 1, duration: 1 }, 2.2);

    gsap.to(q("[data-hero-zoom]"), { scale: 1.07, xPercent: -1.2, duration: 26, ease: "sine.inOut", yoyo: true, repeat: -1 });

    // ── 5. "VI" hand-off: travels from the hero product line into the Editions heading ──
    // Declared before the scroll story so the desktop pin can arm it from its own progress
    // (a second trigger on the pinned element would be measured after the pin spacing).
    const anchor = scope.querySelector<HTMLElement>("[data-handoff-anchor]");
    const target = document.querySelector<HTMLElement>("[data-handoff-target]");
    const traveller = scope.querySelector<HTMLElement>("[data-handoff-traveller]");
    const [plain, glow] = traveller ? (Array.from(traveller.children) as HTMLElement[]) : [];
    const triggers: ScrollTrigger[] = [];
    const state = { armed: false, p: 0 };
    const ease = gsap.parseEase("power2.inOut");
    const hide = (el: HTMLElement, hidden: boolean) => (el.style.visibility = hidden ? "hidden" : "");
    const render = () => {
      if (!anchor || !target || !traveller) return;
      const active = state.armed && state.p < 1;
      hide(traveller, !active);
      hide(anchor, active || state.p >= 1);
      hide(target, active);
      if (!active) return;
      // Live rects: correct with the pin, any viewport size and mid-scroll resizes.
      const a = anchor.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const aStyle = getComputedStyle(anchor);
      const tSize = parseFloat(getComputedStyle(target).fontSize);
      const aSize = parseFloat(aStyle.fontSize);
      const e = ease(state.p);
      traveller.style.fontSize = `${tSize}px`;
      // Starts letter-spaced like the product line, tightens as it flies; white → sunset gradient.
      traveller.style.letterSpacing = `${lerp((parseFloat(aStyle.letterSpacing) || 0) / aSize, 0, e)}em`;
      if (plain && glow) {
        // A gradient anchor (the hero title) stays gradient; a plain one crossfades into it.
        const fromGradient = anchor.dataset.handoffGradient !== undefined;
        plain.style.opacity = fromGradient ? "0" : String(1 - e);
        glow.style.opacity = fromGradient ? "1" : String(e);
      }
      gsap.set(traveller, { x: lerp(a.left, t.left, e), y: lerp(a.top, t.top, e), scale: lerp(aSize / tSize, 1, e), transformOrigin: "0 0" });
    };
    const tick = () => {
      if (state.armed && state.p < 1) render();
    };
    const handoff = { arm: (on: boolean) => on !== state.armed && ((state.armed = on), render()) };

    // ── 3. Scroll story ───────────────────────────────────────────────────────
    if (conditions.desktop) {
      // Pinned camera move: ~85% of a viewport of scroll drives one scrubbed timeline (0 → 1).
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: pinEl,
            start: "top top",
            end: "+=85%",
            pin: pinEl,
            // The pin distance is reserved in CSS (globals.css, [data-hero-pin-distance]), so ScrollTrigger must not
            // add or remove spacing itself (that made it shift the scroll position on refresh).
            pinSpacing: false,
            pinSpacer: scope.querySelector<HTMLElement>("[data-hero-spacer]") ?? undefined,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // Arms the "VI" hand-off once the copy starts leaving (pin progress, not a second trigger on the pinned element).
            onUpdate: (s) => handoff.arm(s.progress > 0.08),
          },
        })
        .to(dolly ?? [], { scale: 1.26, yPercent: -2.5, duration: 1 }, 0)
        .to(night ?? [], { autoAlpha: 1, duration: 0.8 }, 0.15)
        .to(content ?? [], { y: -90, autoAlpha: 0, duration: 0.45 }, 0.1)
        .to(cueFill ?? [], { scaleY: 1, duration: 0.12 }, 0)
        .to(cue ?? [], { autoAlpha: 0, duration: 0.12 }, 0.12);
    } else {
      const scroll = { trigger: section, start: "top top", end: "bottom top", scrub: true };
      for (const layer of layers) {
        gsap.to(layer, { yPercent: Number(layer.dataset.depth) * 55, ...(layer.dataset.scrollZoom !== undefined && { scale: 1.08 }), ease: "none", scrollTrigger: scroll });
      }
      gsap.to(dolly ?? [], { scale: 1.12, ease: "none", scrollTrigger: scroll });
      gsap.to(night ?? [], { autoAlpha: 1, ease: "none", scrollTrigger: scroll });
      gsap.to(content ?? [], { y: -60, autoAlpha: 0, ease: "none", scrollTrigger: { ...scroll, start: "30% top", end: "85% top" } });
    }

    // Hand-off wiring: phones arm on the content fade; both travel while Editions rises into view.
    if (anchor && target && traveller) {
      if (!conditions.desktop) triggers.push(ScrollTrigger.create({ trigger: section, start: "30% top", end: "max", onToggle: (s) => handoff.arm(s.isActive), onUpdate: render }));
      triggers.push(ScrollTrigger.create({ trigger: target, start: "top 82%", end: "top 40%", onUpdate: (s) => ((state.p = s.progress), render()), onRefresh: (s) => ((state.p = s.progress), render()) }));
      ScrollTrigger.addEventListener("refresh", render);
      // Follow every frame while in flight: scrubbed tweens (copy lift, smoothing) keep moving between scroll events.
      gsap.ticker.add(tick);
      render();
    }

    // ── 4. Pointer: depth drift and spotlight (desktop, fine pointer) ───────────
    if (!conditions.desktop || !matchMedia("(pointer: fine)").matches) return () => (triggers.forEach((t) => t.kill()), ScrollTrigger.removeEventListener("refresh", render), gsap.ticker.remove(tick));
    const movers = layers.map((el) => ({
      x: gsap.quickTo(el, "x", { duration: 1.8, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1.8, ease: "power3.out" }),
      d: Number(el.dataset.depth),
    }));
    const spotX = spot ? gsap.quickTo(spot, "x", { duration: 0.9, ease: "power3.out" }) : null;
    const spotY = spot ? gsap.quickTo(spot, "y", { duration: 0.9, ease: "power3.out" }) : null;
    // Pointer work only while the hero is on screen (no layout reads during clicks elsewhere).
    let inView = true;
    const io = new IntersectionObserver(([entry]) => (inView = Boolean(entry?.isIntersecting)));
    io.observe(section);
    const onMove = (e: PointerEvent) => {
      if (!inView) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      for (const m of movers) {
        m.x(nx * -70 * m.d);
        m.y(ny * -36 * m.d);
      }
      if (spot && spot.parentElement) {
        const r = spot.parentElement.getBoundingClientRect();
        spotX!(e.clientX - r.left - spot.offsetWidth / 2);
        spotY!(e.clientY - r.top - spot.offsetHeight / 2);
      }
    };
    const onEnter = () => spot && gsap.to(spot, { autoAlpha: 1, duration: 0.8, ease: "power2.out" });
    const onLeave = () => spot && gsap.to(spot, { autoAlpha: 0, duration: 0.8, ease: "power2.out" });
    window.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerenter", onEnter);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      triggers.forEach((t) => t.kill());
      ScrollTrigger.removeEventListener("refresh", render);
      gsap.ticker.remove(tick);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerenter", onEnter);
      section.removeEventListener("pointerleave", onLeave);
    };
  });

  return (
    <div ref={ref}>
      {children}
      {/* The travelling "VI" (fixed; shown only during the hand-off, styled like its landing spot). */}
      <span
        aria-hidden
        data-handoff-traveller
        style={{ visibility: "hidden" }}
        className="pointer-events-none fixed top-0 left-0 z-30 inline-block pr-[0.04em] font-display leading-[0.85] font-extrabold will-change-transform"
      >
        <span className="text-warm/90">VI</span>
        <span className="absolute inset-0 bg-[linear-gradient(100deg,var(--color-vice),var(--color-sunset))] bg-clip-text pr-[0.04em] text-transparent opacity-0">VI</span>
      </span>
    </div>
  );
}

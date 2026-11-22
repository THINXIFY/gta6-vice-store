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
 *    lifts away and the scene shifts from dusk to night. With heroArt.scrollTo it becomes a sunrise:
 *    night holds, daylight spreads from the sun across the city (a growing soft-edged mask on the
 *    morning frame), with a horizon glow, lens flare, light rays, gulls and an in-game clock
 *    (11:58 PM → 6:30 AM), then morning settles. Phones: no pin, the same story scroll-linked.
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
    // With a second light of the frame (morning), scrolling crossfades into it instead of deepening to night.
    const [morning] = q("[data-hero-morning]");
    const [shade] = q("[data-hero-shade]");
    const [cue] = q("[data-hero-cue]");
    const [cueFill] = q("[data-hero-cue-fill]");
    const [spot] = q("[data-hero-spot]") as HTMLElement[];
    const [clock] = q("[data-hero-clock]") as HTMLElement[];

    // ── Sunrise (with heroArt.scrollTo): daylight spreads from the sun across the city ──
    const [zoomEl] = q("[data-hero-zoom]") as HTMLElement[];
    const sunrise = Boolean(morning && zoomEl?.dataset.sunX);
    let maxReveal = 2400;
    /** Puts the sun where it really appears for this crop (object-cover + object-position), in pixels. */
    const placeSun = () => {
      if (!sunrise || !zoomEl || !morning) return;
      const W = zoomEl.offsetWidth;
      const H = zoomEl.offsetHeight;
      const sw = Number(zoomEl.dataset.srcW);
      const sh = Number(zoomEl.dataset.srcH);
      const k = Math.max(W / sw, H / sh);
      const [fx = 0.5, fy = 0.5] = getComputedStyle(morning).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      const sx = (W - sw * k) * fx + Number(zoomEl.dataset.sunX) * k;
      const sy = (H - sh * k) * fy + Number(zoomEl.dataset.sunY) * k;
      zoomEl.style.setProperty("--sun-x", `${sx}px`);
      zoomEl.style.setProperty("--sun-y", `${sy}px`);
      // Far enough to clear the farthest corner, plus the soft edge (22vmax).
      maxReveal = Math.hypot(Math.max(sx, W - sx), Math.max(sy, H - sy)) + 0.24 * Math.max(innerWidth, innerHeight);
    };
    placeSun();
    if (sunrise) {
      gsap.set(morning!, { opacity: 1 }); // hidden by the reveal mask (--reveal: 0) until the sun comes up
      ScrollTrigger.addEventListener("refreshInit", placeSun);
    }
    const timeEl = clock?.querySelector<HTMLElement>("[data-hero-clock-time]");
    const labelEl = clock?.querySelector<HTMLElement>("[data-hero-clock-label]");
    let lastClock = "";
    /** In-game clock: 11:58 PM until the sun starts, then to 6:30 AM by the time morning has settled. */
    const setClock = (p: number) => {
      if (!clock || !timeEl || !labelEl) return;
      const t = gsap.utils.clamp(0, 1, (p - 0.18) / 0.62);
      const mins = Math.round(23 * 60 + 58 + t * 392) % 1440;
      const h = Math.floor(mins / 60);
      const text = `${h % 12 || 12}:${String(mins % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
      const phase = p < 0.3 ? "night" : p < 0.62 ? "dawn" : "morning";
      if (text + phase === lastClock) return;
      lastClock = text + phase;
      timeEl.textContent = text;
      labelEl.textContent = phase === "night" ? "Night" : phase === "dawn" ? "Dawn" : "Morning";
      clock.dataset.phase = phase;
    };
    /**
     * The sunrise on a 0 → 1 scroll timeline. Pacing: night holds (0–0.2), the sun comes up and
     * daylight spreads (0.2–0.78), morning settles (0.78–1).
     */
    const addSunrise = (tl: gsap.core.Timeline) => {
      if (!sunrise || !zoomEl) return;
      const [rays] = q("[data-hero-rays]");
      const [glow] = q("[data-hero-glow]");
      const [flare] = q("[data-hero-flare]");
      const [birds] = q("[data-hero-birds]") as HTMLElement[];
      const [cool] = q("[data-hero-grade-cool]");
      const [warm] = q("[data-hero-grade-warm]");
      tl.fromTo(zoomEl, { "--reveal": "0px" }, { "--reveal": () => `${maxReveal}px`, duration: 0.58, ease: "power1.inOut" }, 0.2)
        .fromTo(glow ?? [], { opacity: 0, scale: 0.45 }, { opacity: 1, scale: 1.05, duration: 0.3, ease: "power2.out" }, 0.2)
        .to(glow ?? [], { opacity: 0.35, scale: 1.3, duration: 0.3, ease: "sine.inOut" }, 0.62)
        .fromTo(rays ?? [], { opacity: 0, rotation: -6 }, { opacity: 0.9, rotation: 4, duration: 0.32, ease: "power1.out" }, 0.26)
        .to(rays ?? [], { opacity: 0.22, rotation: 10, duration: 0.4, ease: "sine.inOut" }, 0.58)
        .fromTo(flare ?? [], { opacity: 0 }, { opacity: 1, duration: 0.14 }, 0.32)
        .to(flare ?? [], { opacity: 0, duration: 0.22 }, 0.6)
        .fromTo(birds ?? [], { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.34)
        .fromTo(birds ?? [], { x: 0, y: 0 }, { x: () => (zoomEl.offsetWidth + (birds?.offsetWidth ?? 0)) * 1.05, y: -24, duration: 0.6 }, 0.34)
        // Colour grade: blue hour deepens before dawn, a golden grade at the sunrise peak, then daylight.
        .fromTo(cool ?? [], { opacity: 0 }, { opacity: 0.55, duration: 0.18, ease: "sine.in" }, 0.06)
        .to(cool ?? [], { opacity: 0, duration: 0.2, ease: "sine.out" }, 0.28)
        .fromTo(warm ?? [], { opacity: 0 }, { opacity: 0.62, duration: 0.24, ease: "sine.inOut" }, 0.3)
        .to(warm ?? [], { opacity: 0.12, duration: 0.3, ease: "sine.inOut" }, 0.64)
        // Camera: a slight drift while the light changes.
        .to(dolly ?? [], { xPercent: -1.4, duration: 0.6, ease: "sine.inOut" }, 0.2)
        .to(shade ?? [], { opacity: 0.35, duration: 0.35 }, 0.45);
      tl.eventCallback("onUpdate", () => setClock(tl.progress()));
      setClock(0);
    };

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
      .to(cue ?? [], { autoAlpha: 1, duration: 1 }, 2.2)
      .to(clock ?? [], { autoAlpha: 1, duration: 1 }, 2.4);

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
      const story = gsap
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
        .to(sunrise ? [] : night ?? [], { autoAlpha: 1, duration: 0.8 }, 0.15)
        .to(content ?? [], { y: -90, autoAlpha: 0, duration: 0.45 }, 0.1)
        .to(cueFill ?? [], { scaleY: 1, duration: 0.12 }, 0)
        .to(cue ?? [], { autoAlpha: 0, duration: 0.12 }, 0.12);
      addSunrise(story);
    } else {
      const scroll = { trigger: section, start: "top top", end: "bottom top", scrub: true };
      for (const layer of layers) {
        gsap.to(layer, { yPercent: Number(layer.dataset.depth) * 55, ...(layer.dataset.scrollZoom !== undefined && { scale: 1.08 }), ease: "none", scrollTrigger: scroll });
      }
      gsap.to(dolly ?? [], { scale: 1.12, ease: "none", scrollTrigger: scroll });
      // Phones: the image sits above the copy and leaves the screen early, so the sunrise plays over the first stretch.
      if (sunrise) addSunrise(gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { ...scroll, end: "38% top", invalidateOnRefresh: true } }));
      else gsap.to(night ?? [], { autoAlpha: 1, ease: "none", scrollTrigger: scroll });
      gsap.to(content ?? [], { y: -60, autoAlpha: 0, ease: "none", scrollTrigger: { ...scroll, start: "30% top", end: "85% top" } });
    }

    // ── Speed-reactive scroll: scroll fast and the camera pushes in a touch and the light rays stretch;
    //    stop and everything eases back. Own wrappers, so it never fights the scrubbed timeline.
    const [kick] = q("[data-hero-kick]") as HTMLElement[];
    const [raysKick] = q("[data-hero-rays-kick]") as HTMLElement[];
    // quickTo cannot drive the "scale" shorthand, so one eased number drives both wrappers.
    const speed = { a: 0 };
    const toSpeed = gsap.quickTo(speed, "a", {
      duration: 0.7,
      ease: "power3.out",
      onUpdate: () => {
        if (kick) gsap.set(kick, { scale: 1 + speed.a * 0.035 });
        if (raysKick) gsap.set(raysKick, { scale: 1 + speed.a * 0.3 });
      },
    });
    // Smooth scrolling softens velocity: about 1,500 px/s already reads as "fast".
    const react = (velocity: number) => toSpeed(gsap.utils.clamp(0, 1, Math.abs(velocity) / 1500));
    const settle = () => react(0);
    if (kick) {
      // Hero region in page pixels (the desktop pin holds it for its pin distance).
      triggers.push(ScrollTrigger.create({ start: 0, end: () => window.innerHeight * 1.9, onUpdate: (st) => react(st.getVelocity()), onLeave: settle, onLeaveBack: settle }));
      ScrollTrigger.addEventListener("scrollEnd", settle);
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
    if (!conditions.desktop || !matchMedia("(pointer: fine)").matches)
      return () => (triggers.forEach((t) => t.kill()), ScrollTrigger.removeEventListener("refresh", render), ScrollTrigger.removeEventListener("refreshInit", placeSun), ScrollTrigger.removeEventListener("scrollEnd", settle), gsap.ticker.remove(tick));
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
      ScrollTrigger.removeEventListener("refreshInit", placeSun);
      ScrollTrigger.removeEventListener("scrollEnd", settle);
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

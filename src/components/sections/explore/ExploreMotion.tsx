"use client";

import type { ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useGsap } from "@/lib/motion/useGsap";

/**
 * Explore's orchestrated moment, scrubbed to scroll:
 * 1. LEONIDA's letters rise into place one after another;
 * 2. the street scene opens from a rounded, zoomed-in frame to full bleed,
 *    sliding over the title while the image settles from a deep zoom;
 * 3. the "Vice City" caption lands as the frame completes.
 * The night portrait drifts gently. Reduced motion / no JS = final static layout.
 */
export function ExploreMotion({ children }: { children: ReactNode }) {
  const ref = useGsap<HTMLDivElement>(({ scope }) => {
    const frame = scope.querySelector("[data-world-frame]");
    const title = scope.querySelector("[data-world-title]");
    if (!frame || !title) return;
    const cleanups: (() => void)[] = [];

    gsap.fromTo(
      title.querySelectorAll("[data-letter]"),
      { yPercent: 55, opacity: 0 },
      { yPercent: 0, opacity: 1, ease: "power2.out", stagger: 0.08, scrollTrigger: { trigger: title, start: "top 92%", end: "top 45%", scrub: 0.6 } },
    );
    gsap.fromTo("[data-world-kicker]", { y: 24, opacity: 0 }, { y: 0, opacity: 1, scrollTrigger: { trigger: title, start: "top 95%", end: "top 70%", scrub: 0.6 } });

    const open = gsap.timeline({ scrollTrigger: { trigger: frame, start: "top 95%", end: "top 12%", scrub: 0.8 } });
    open
      .fromTo(frame, { clipPath: "inset(10% 12% 0% 12% round 2.5rem)" }, { clipPath: "inset(0% 0% 0% 0% round 0rem)", ease: "none" }, 0)
      .fromTo("[data-world-image]", { scale: 1.3 }, { scale: 1, ease: "none" }, 0)
      .fromTo(title, { yPercent: 0 }, { yPercent: -12, ease: "none" }, 0)
      .fromTo("[data-world-caption] > *", { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, ease: "power2.out", duration: 0.35 }, 0.62);

    // The helicopter flies over the city with the scroll. Layers, one job each:
    //  [data-world-heli]  flight: flies in and arrives at its hover spot (back out the way it came
    //                     when you scroll up), approaches the camera, altitude arc, banks with
    //                     scroll speed (nose down into the direction of travel), levels when you stop;
    //                     its rotor (GifPlayer, data-gif-rate) spins faster while you scroll.
    //  [data-heli-hover]  hover: a gentle bob and sway, so it never freezes mid-air.
    //  [data-heli-face]   facing: turns around to fly forward in whichever direction you scroll.
    //  [data-heli-beam]   searchlight: sweeps slowly over the city.
    const heli = scope.querySelector<HTMLElement>("[data-world-heli]");
    const hover = scope.querySelector<HTMLElement>("[data-heli-hover]");
    const face = scope.querySelector<HTMLElement>("[data-heli-face]");
    const beam = scope.querySelector<HTMLElement>("[data-heli-beam]");
    if (heli && hover && face) {
      const box = frame as HTMLElement;
      const bank = gsap.quickTo(heli, "rotation", { duration: 0.8, ease: "power3.out" });
      const rotor = { rate: 1 };
      const spin = gsap.quickTo(rotor, "rate", { duration: 0.6, ease: "power2.out", onUpdate: () => (heli.dataset.gifRate = rotor.rate.toFixed(2)) });
      let facing = 1;
      const turn = (dir: number) => {
        if (dir === facing) return;
        facing = dir;
        // A banking turn: the body narrows through the turn while dipping slightly.
        gsap.timeline({ overwrite: true })
          .to(face, { scaleX: dir, duration: 0.75, ease: "power2.inOut" }, 0)
          .to(face, { y: 6, duration: 0.375, ease: "sine.out", yoyo: true, repeat: 1 }, 0);
      };

      // Flies in from beyond the left edge while the scene rises, and arrives at its hover spot
      // (its CSS position, clear of the header) as the scene settles into view.
      const flight = { trigger: box, start: "top 95%", end: "top 15%", scrub: 1.4, invalidateOnRefresh: true };
      gsap.fromTo(
        heli,
        { x: () => -(heli.offsetLeft + heli.offsetWidth * 1.15), scale: 0.62 },
        {
          x: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            ...flight,
            onUpdate: (self) => {
              const v = self.getVelocity();
              bank(gsap.utils.clamp(-14, 14, v / 180));
              spin(gsap.utils.clamp(1, 3, 1 + Math.abs(v) / 1200));
              if (Math.abs(v) > 40) turn(self.direction);
            },
          },
        },
      );
      gsap.fromTo(heli, { y: 80 }, { keyframes: { y: [90, -26, 14, 0], easeEach: "sine.inOut" }, ease: "none", scrollTrigger: flight });

      const settle = () => {
        bank(0);
        spin(1);
      };
      ScrollTrigger.addEventListener("scrollEnd", settle);
      cleanups.push(() => ScrollTrigger.removeEventListener("scrollEnd", settle));

      // Idle life (hover and searchlight) runs only while the scene is on screen.
      const idle = [
        gsap.to(hover, { y: -9, rotation: 1.2, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }),
        ...(beam ? [gsap.fromTo(beam, { rotation: -11 }, { rotation: 11, duration: 3.6, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true })] : []),
      ];
      ScrollTrigger.create({ trigger: box, start: "top bottom", end: "bottom top", onToggle: (s) => idle.forEach((t) => (s.isActive ? t.play() : t.pause())) });
    }

    // Region tiles rise in sequence once as the grid arrives (one moment; hover is CSS). Opacity, not
    // autoAlpha: hidden visibility would drop the list from the accessibility tree until scrolled to.
    const tiles = scope.querySelectorAll("[data-region]");
    if (tiles.length) {
      gsap.from(tiles, { y: 46, opacity: 0, duration: 0.9, stagger: 0.08, ease: "expo.out", clearProps: "transform,opacity", scrollTrigger: { trigger: tiles[0], start: "top 88%", once: true } });
    }

    const night = scope.querySelector("[data-world-night]");
    if (night) {
      gsap.fromTo(night, { y: 60 }, { y: -40, ease: "none", scrollTrigger: { trigger: night, start: "top bottom", end: "bottom top", scrub: true } });
    }
    return () => cleanups.forEach((c) => c());
  });

  return <div ref={ref}>{children}</div>;
}

"use client";

import { useEffect, useRef } from "react";

/**
 * Atmospheric particle field: soft neon motes (pink, purple, orange, electric blue) and
 * fine warm dust drifting upward with a slow sway, layered by depth and nudged by the
 * pointer. One canvas, pre-rendered glow sprites, additive blending, ~60–110 particles.
 * Paused off-screen and in background tabs; not rendered at all under reduced motion.
 */

const NEON = ["255,87,154", "178,140,255", "255,155,98", "76,201,255"];
const DUST = "255,236,214";

type P = { x: number; y: number; z: number; r: number; vy: number; sway: number; phase: number; alpha: number; twinkle: number; sprite: number };

function sprite(rgb: string, size = 64): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.08, `rgba(${rgb},1)`);
  grad.addColorStop(0.2, `rgba(${rgb},0.75)`);
  grad.addColorStop(0.5, `rgba(${rgb},0.18)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function HeroParticles({ className, density = 12000, max = 130 }: { className?: string; density?: number; max?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprites = [...NEON.map((c) => sprite(c)), sprite(DUST, 32)];
    let w = 0;
    let h = 0;
    let particles: P[] = [];
    let raf = 0;
    let visible = true;
    let last = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    // Scroll velocity (px/s, smoothed): fast scrolling stretches motes into light streaks.
    const scroll = { y: window.scrollY, v: 0 };

    /** Three kinds: neon motes (crisp glow), bokeh (large, very soft, far) and fine warm dust. */
    const spawn = (anywhere: boolean): P => {
      const roll = Math.random();
      const kind = roll < 0.38 ? "neon" : roll < 0.5 ? "bokeh" : "dust";
      const z = kind === "bokeh" ? 0.25 + Math.random() * 0.3 : 0.35 + Math.random() * 0.65; // 1 = near
      const r = kind === "neon" ? (8 + Math.random() * 14) * (0.6 + z * 0.6) : kind === "bokeh" ? 26 + Math.random() * 30 : 2 + Math.random() * 2.8;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 20,
        z,
        r,
        vy: -(5 + Math.random() * 14) * (0.4 + z), // px per second, upward
        sway: 6 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        alpha: kind === "neon" ? 0.55 + Math.random() * 0.4 : kind === "bokeh" ? 0.1 + Math.random() * 0.12 : 0.35 + Math.random() * 0.4,
        twinkle: 0.4 + Math.random() * 1.2,
        sprite: kind === "dust" ? NEON.length : Math.floor(Math.random() * NEON.length),
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(max, Math.max(Math.min(50, max), Math.round((w * h) / density)));
      particles = Array.from({ length: target }, () => spawn(true));
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const sy = window.scrollY;
      const raw = dt > 0 ? (sy - scroll.y) / dt : 0;
      scroll.y = sy;
      scroll.v += (Math.max(-4000, Math.min(4000, raw)) - scroll.v) * 0.12;
      const speed = Math.min(1, Math.abs(scroll.v) / 2200);

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        // Drift against the scroll direction, nearer motes faster (parallax).
        p.y += p.vy * dt - scroll.v * dt * 0.28 * p.z;
        if (p.y > h + 40) Object.assign(p, spawn(true), { y: -20 });
        if (p.y < -30) Object.assign(p, spawn(false));
        const x = p.x + Math.sin(t * 0.35 + p.phase) * p.sway + pointer.x * 22 * p.z;
        const y = p.y + pointer.y * 14 * p.z;
        const a = p.alpha * (0.65 + 0.35 * Math.sin(t * p.twinkle + p.phase));
        // Fade in from the bottom and out near the top for a natural rise.
        const edge = Math.min(1, (h - p.y) / 120, (p.y + 30) / 160);
        ctx.globalAlpha = Math.max(0, a * edge);
        const stretch = 1 + speed * 3.2 * p.z;
        if (stretch > 1.05) ctx.globalAlpha *= 1 / Math.sqrt(stretch);
        ctx.drawImage(sprites[p.sprite]!, x - p.r, y - p.r * stretch, p.r * 2, p.r * 2 * stretch);
      }
      ctx.globalAlpha = 1;
    };

    const onMove = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting) && !document.hidden;
      last = performance.now();
    });
    const onVisibility = () => {
      visible = !document.hidden;
      last = performance.now();
    };
    const ro = new ResizeObserver(resize);

    resize();
    ro.observe(canvas);
    io.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    if (matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
    };
  }, [density, max]);

  return <canvas ref={ref} aria-hidden data-hero-particles className={className} />;
}

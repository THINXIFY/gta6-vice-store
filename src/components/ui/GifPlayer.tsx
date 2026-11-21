"use client";

import { useEffect, useRef } from "react";
import { decodeGif } from "@/lib/gif";
import { cn } from "@/lib/utils";

/**
 * Plays an animated GIF on a canvas (transparency kept) so playback can be controlled:
 * paused off-screen and in background tabs, an optional live playback rate ([data-gif-rate] on an
 * ancestor), a still frame under reduced motion, plain GIF
 * without JavaScript. Frames are decoded once with the dependency-free decoder (src/lib/gif.ts).
 */
export function GifPlayer({ src, width, height, className }: { src: string; width: number; height: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let cancelled = false;
    let raf = 0;
    let io: IntersectionObserver | undefined;

    (async () => {
      const res = await fetch(src);
      if (!res.ok || cancelled) return;
      const gif = decodeGif(await res.arrayBuffer());
      const frames = await Promise.all(gif.frames.map((f) => createImageBitmap(new ImageData(f.rgba, gif.width, gif.height))));
      if (cancelled || !frames.length) return;
      canvas.width = gif.width;
      canvas.height = gif.height;
      const draw = (i: number) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frames[i]!, 0, 0);
      };
      draw(0);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || frames.length < 2) return;

      let visible = true;
      let index = 0;
      let elapsed = 0;
      let last = performance.now();
      io = new IntersectionObserver(([e]) => {
        visible = Boolean(e?.isIntersecting);
        last = performance.now();
      });
      io.observe(canvas);
      // Optional playback rate from the nearest [data-gif-rate] (e.g. a rotor that spins faster while scrolling).
      const rateHost = canvas.closest<HTMLElement>("[data-gif-rate]");
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (!visible || document.hidden) {
          last = now;
          return;
        }
        elapsed += (now - last) * (rateHost ? Number(rateHost.dataset.gifRate) || 1 : 1);
        last = now;
        let advanced = false;
        while (elapsed >= gif.frames[index]!.delayMs) {
          elapsed -= gif.frames[index]!.delayMs;
          index = (index + 1) % frames.length;
          advanced = true;
        }
        if (advanced) draw(index);
      };
      raf = requestAnimationFrame(tick);
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [src]);

  return (
    <>
      <canvas ref={ref} aria-hidden width={width} height={height} className={cn("block", className)} />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- no-JS fallback: the plain animated GIF */}
        <img src={src} alt="" width={width} height={height} className={className} />
      </noscript>
    </>
  );
}

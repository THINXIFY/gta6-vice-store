"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { getLenis } from "@/components/motion/SmoothScroll";
import type { GalleryItem } from "@/config/types";

type Props = { items: GalleryItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void };

/**
 * Fullscreen viewer on a native <dialog> (focus trap, Esc, top layer for free).
 * ←/→ keys, on-screen buttons and horizontal swipes move between images; wraps around.
 */
export function Lightbox({ items, index, onIndex, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const swipe = useRef<number | null>(null);
  const item = index === null ? null : items[index];
  const count = items.length;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) {
      dialog.showModal();
      getLenis()?.stop();
    } else if (index === null && dialog.open) {
      dialog.close();
    }
  }, [index]);

  const go = (step: number) => {
    if (index === null) return;
    onIndex((index + step + count) % count);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };

  const onPointerDown = (e: PointerEvent) => { swipe.current = e.clientX; };
  const onPointerUp = (e: PointerEvent) => {
    if (swipe.current === null) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <dialog
      ref={ref}
      aria-label="Image viewer"
      onKeyDown={onKeyDown}
      onClose={() => { getLenis()?.start(); onClose(); }}
      className="lightbox m-0 h-dvh max-h-none w-full max-w-none bg-obsidian p-0 text-warm backdrop:bg-obsidian"
    >
      {item && (
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between px-gutter">
            <p className="text-sm tabular-nums text-warm/70" aria-live="polite">
              <span className="sr-only">Image </span>{(index ?? 0) + 1} / {count}
            </p>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close viewer" className="-mr-2 grid size-11 place-items-center rounded-control hover:bg-warm/10">
              <X aria-hidden className="size-6" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 touch-pan-y select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
            <Image key={item.id} src={item.src} alt={item.alt} fill sizes="100vw" className="swap-in object-contain" draggable={false} />
            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="absolute top-1/2 left-3 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-obsidian/70 hover:bg-warm hover:text-obsidian sm:grid lg:left-6">
                  <ChevronLeft aria-hidden className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next image" className="absolute top-1/2 right-3 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-obsidian/70 hover:bg-warm hover:text-obsidian sm:grid lg:right-6">
                  <ChevronRight aria-hidden className="size-6" />
                </button>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 px-gutter pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0">
              <p className="truncate font-semibold">{item.caption}</p>
              <p className="text-xs text-warm/50">{item.credit}</p>
            </div>
            {count > 1 && (
              <div className="flex gap-2 sm:hidden">
                <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="grid size-11 place-items-center rounded-full bg-warm/10">
                  <ChevronLeft aria-hidden className="size-5" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next image" className="grid size-11 place-items-center rounded-full bg-warm/10">
                  <ChevronRight aria-hidden className="size-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

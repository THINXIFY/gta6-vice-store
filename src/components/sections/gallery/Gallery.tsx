"use client";

import { Maximize2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { useCopy } from "@/components/ContentProvider";
import { gallery as allItems } from "@/config/media";
import type { GalleryItem } from "@/config/types";
import { gsap } from "@/lib/motion/gsap";
import { isUsable } from "@/lib/media";
import { useGsap } from "@/lib/motion/useGsap";
import { cn } from "@/lib/utils";
import { Lightbox } from "./Lightbox";

const items = allItems.filter((i) => isUsable(i));

type PanelProps = {
  item: GalleryItem;
  index: number;
  active: boolean;
  onActivate: () => void;
  onOpen: (el: HTMLButtonElement) => void;
};

/**
 * One panel of the strip. Collapsed it shows a tight close-up; as it expands the
 * close-up eases out toward the wider frame ("a closer look", in reverse).
 * Pointer/focus activates; activating an already-active panel opens the viewer,
 * so touch users tap once to expand and again to view.
 */
function Panel({ item, index, active, onActivate, onOpen }: PanelProps) {
  const { focus, zoom } = item.detail;
  // Focus from a tap/click must not pre-activate, or the first tap would open the viewer.
  const pointerDown = useRef(false);
  return (
    <li
      data-gallery-item
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden rounded-media bg-midnight transition-[flex-grow] duration-700 ease-cinematic",
        "max-md:w-[84%] max-md:shrink-0 max-md:snap-center",
        active ? "md:grow-[3.4]" : "md:grow",
      )}
      style={{ flexBasis: "var(--panel-basis)" }}
    >
      <button
        type="button"
        onPointerEnter={(e) => e.pointerType === "mouse" && onActivate()}
        onPointerDown={() => (pointerDown.current = true)}
        onFocus={() => {
          if (!pointerDown.current) onActivate();
          pointerDown.current = false;
        }}
        onClick={(e) => {
          pointerDown.current = false;
          onActivate();
          onOpen(e.currentTarget);
        }}
        aria-label={`View full image: ${item.caption}`}
        aria-describedby="gallery-hint"
        className="group absolute inset-0 block size-full text-left"
      >
        <span data-gallery-media className="absolute inset-0 block">
          <Image
            src={item.src}
            alt=""
            fill
            sizes={`(min-width: 48rem) ${Math.round(60 * zoom)}vw, ${Math.round(100 * zoom)}vw`}
            className="object-cover transition-[scale] duration-[1200ms] ease-cinematic [scale:var(--z-open)] md:[scale:var(--z)]"
            style={{ objectPosition: focus, transformOrigin: focus, "--z-open": Math.max(1.05, zoom * 0.62), "--z": active ? Math.max(1.05, zoom * 0.62) : zoom } as React.CSSProperties}
          />
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 bg-linear-to-t from-obsidian/85 via-obsidian/10 to-transparent transition-opacity duration-700",
            active ? "opacity-100" : "opacity-100 md:opacity-60",
          )}
        />
        <span aria-hidden className={cn("absolute inset-0 bg-obsidian/45 transition-opacity duration-700", active ? "opacity-0" : "opacity-0 md:opacity-100 md:group-hover:opacity-60")} />

        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7 lg:p-9">
          <span className={cn("min-w-0 transition-[opacity,translate] duration-700 ease-cinematic", active ? "translate-y-0 opacity-100" : "max-md:translate-y-0 max-md:opacity-100 md:translate-y-4 md:opacity-0")}>
            <span className="block text-xs font-medium text-sunset tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </span>
            <span className="mt-1.5 block font-display text-[clamp(1.75rem,1.1rem+2.4vw,3.5rem)] leading-[0.9] font-extrabold uppercase">{item.caption}</span>
          </span>
          <span
            aria-hidden
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-full bg-warm text-obsidian transition-[opacity,scale] duration-500 ease-cinematic",
              active ? "scale-100 opacity-100" : "max-md:scale-100 max-md:opacity-100 md:scale-75 md:opacity-0",
            )}
          >
            <Maximize2 className="size-5" />
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * "A closer look": an expanding strip of official close-ups. Horizontal on tablet and
 * desktop, vertical on phones. The full frame opens in a lightbox.
 */
export function Gallery() {
  // Wording from Admin → Content (defaults in src/config/content.ts).
  const copy = useCopy();
  const galleryCopy = copy.gallery;
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const ref = useGsap<HTMLElement>(({ scope }) => {
    const strip = scope.querySelector("[data-gallery-strip]");
    if (!strip) return;
    const trigger = { trigger: strip, start: "top 80%", once: true };
    gsap.from(scope.querySelectorAll("[data-gallery-item]"), {
      clipPath: "inset(100% 0% 0% 0% round 1.25rem)",
      duration: 1.3,
      ease: "expo.inOut",
      stagger: 0.12,
      scrollTrigger: trigger,
    });
    gsap.from(scope.querySelectorAll("[data-gallery-media]"), { scale: 1.25, duration: 1.8, ease: "expo.out", stagger: 0.12, scrollTrigger: trigger });
  });

  // A gallery needs at least two frames; a single tile reads as unfinished.
  if (items.length < 2) return null;

  return (
    <section ref={ref} id="gallery" aria-labelledby="gallery-title" className="relative isolate bg-obsidian py-section">
      <Glow tone="sunset" className="-left-48 top-[8%] size-[40rem]" strength={0.11} speed={0.4} />
      <Glow tone="lavender" className="-right-56 bottom-[6%] size-[44rem]" strength={0.13} speed={0.55} />
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <Display reveal as="h2" id="gallery-title" size="md" caps={false} className="tracking-[-0.005em]">
            {galleryCopy.heading}
          </Display>
          <p id="gallery-hint" className="max-w-[20rem] text-sm text-warm/55">
            Official screenshots and key art. Select one to see the full frame.
          </p>
        </div>

        <ul
          data-gallery-strip
          className="-mx-gutter mt-10 flex h-[min(118vw,34rem)] snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter [--panel-basis:auto] [scrollbar-width:none] md:mx-0 md:h-[min(62vh,44rem)] md:snap-none md:gap-4 md:overflow-visible md:px-0 md:[--panel-basis:0] lg:mt-14 lg:h-[min(72vh,48rem)]"
        >
          {items.map((item, i) => (
            <Panel
              key={item.id}
              item={item}
              index={i}
              active={i === active}
              onActivate={() => setActive(i)}
              onOpen={(el) => {
                opener.current = el;
                setOpen(i);
              }}
            />
          ))}
        </ul>
      </Container>

      <Lightbox
        items={items}
        index={open}
        onIndex={(i) => {
          setOpen(i);
          setActive(i);
        }}
        onClose={() => {
          // Return focus to the panel of the image last viewed (it is also the active one).
          const last = open ?? 0;
          setOpen(null);
          const panels = opener.current?.closest("[data-gallery-strip]")?.querySelectorAll<HTMLButtonElement>("[data-gallery-item] button");
          (panels?.[last] ?? opener.current)?.focus();
        }}
      />
    </section>
  );
}

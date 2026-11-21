"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { trailersCopy } from "@/config/content";
import { trailerEmbeds, trailers as allTrailers } from "@/config/media";
import type { Trailer } from "@/config/types";
import { cn } from "@/lib/utils";

const trailers = allTrailers.filter((t) => t.embeddable);
const thumb = (id: string, size: "maxresdefault" | "mqdefault") => `https://i.ytimg.com/vi/${id}/${size}.jpg`;

function Duration({ seconds, className }: { seconds: number; className?: string }) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return (
    <time dateTime={`PT${m}M${seconds % 60}S`} className={cn("tabular-nums", className)}>
      {m}:{s}
    </time>
  );
}

/** Three bars that pulse while a trailer plays (static under reduced motion). */
function PlayingBars() {
  return (
    <span aria-hidden className="eq inline-flex h-3 items-end gap-[2px]">
      <span /><span /><span />
    </span>
  );
}

function PlaylistItem({ t, selected, playing, onSelect }: { t: Trailer; selected: boolean; playing: boolean; onSelect: () => void }) {
  const state = selected ? (playing ? "Now playing" : "Selected") : null;
  return (
    <li className="w-[68%] shrink-0 snap-start sm:w-[40%] lg:w-auto lg:min-h-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Grand Theft Auto VI ${t.title}`}
        className={cn(
          "group relative grid w-full gap-3 rounded-xl text-left transition-colors duration-300 lg:h-full lg:grid-cols-[9.5rem_1fr] lg:items-center lg:gap-5 lg:p-3",
          selected ? "lg:bg-warm/[0.07]" : "lg:hover:bg-warm/[0.04]",
        )}
      >
        <span
          className={cn(
            "relative block aspect-video overflow-hidden rounded-lg outline-2 -outline-offset-2 transition-[outline-color] duration-300",
            selected ? "outline-sunset" : "outline-transparent group-hover:outline-warm/30",
          )}
        >
          <Image
            src={thumb(t.youtubeId, "mqdefault")}
            alt=""
            fill
            unoptimized
            sizes="20vw"
            className={cn("object-cover transition-[scale,filter] duration-500 ease-cinematic group-hover:scale-105", !selected && "brightness-75 group-hover:brightness-100")}
          />
          <Duration seconds={t.durationSeconds} className="absolute right-1.5 bottom-1.5 rounded bg-obsidian/85 px-1.5 py-0.5 text-[0.6875rem] font-semibold" />
        </span>
        <span className="min-w-0">
          <span className={cn("block truncate font-semibold transition-colors", selected ? "text-warm" : "text-warm/70 group-hover:text-warm")}>{t.title}</span>
          <span className="mt-1 flex h-4 items-center gap-2 text-xs font-medium text-sunset">
            {playing && selected && <PlayingBars />}
            {state}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Official trailers via YouTube's privacy-enhanced player. Only poster images load on
 * arrival; the player loads when the visitor presses play (never autoplays on its own).
 * Fullscreen comes from the YouTube player (allowFullScreen).
 */
export function Trailers() {
  const [activeId, setActiveId] = useState(trailers[0]?.youtubeId ?? "");
  const [playing, setPlaying] = useState(false);
  const active = trailers.find((t) => t.youtubeId === activeId);

  if (!trailerEmbeds || !active) {
    return (
      <section id="trailers" aria-labelledby="trailers-title" className="bg-midnight py-section">
        <Container>
          <Display reveal as="h2" id="trailers-title" size="md" caps={false}>{trailersCopy.heading}</Display>
          <p className="mt-4 text-warm/56">Trailers will appear here soon.</p>
        </Container>
      </section>
    );
  }

  const label = `Grand Theft Auto VI ${active.title}`;

  return (
    <section id="trailers" aria-labelledby="trailers-title" className="relative isolate overflow-hidden bg-fade-out py-section">
      <Glow tone="electric" className="-left-56 top-[20%] size-[50rem]" strength={0.13} speed={0.5} />
      <Glow tone="vice" className="-right-48 bottom-[4%] size-[40rem]" strength={0.13} speed={0.3} />
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <p className="flex items-center gap-3 text-sm font-medium text-sunset">
              <span aria-hidden className="h-px w-8 bg-sunset/70" />
              {trailersCopy.eyebrow}
            </p>
            <Display reveal as="h2" id="trailers-title" size="md" caps={false} className="mt-4 tracking-[-0.005em]">
              {trailersCopy.heading}
            </Display>
          </div>
          <p className="max-w-[20rem] text-sm text-warm/55">{trailersCopy.note}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-12 lg:gap-8">
          <div data-player className="relative aspect-video overflow-hidden rounded-media bg-obsidian lg:col-span-8 xl:col-span-9">
            {playing ? (
              <iframe
                key={active.youtubeId}
                src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?autoplay=1&rel=0&playsinline=1&fs=1`}
                title={label}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            ) : (
              <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 block size-full text-left" aria-label={`Play ${label}`}>
                <Image
                  key={active.youtubeId}
                  src={thumb(active.youtubeId, "maxresdefault")}
                  alt=""
                  fill
                  unoptimized
                  sizes="75vw"
                  className="swap-in object-cover transition-[scale] duration-1000 ease-cinematic group-hover:scale-[1.02]"
                />
                <span aria-hidden className="absolute inset-0 bg-linear-to-t from-obsidian/85 via-obsidian/5 via-50% to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-end gap-3.5 p-4 sm:gap-6 sm:p-8 lg:p-10">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-warm text-obsidian transition-transform duration-500 ease-cinematic group-hover:scale-110 sm:size-20">
                    <Play aria-hidden className="ml-1 size-5 fill-current sm:size-7" />
                  </span>
                  <span key={active.youtubeId} className="swap-in min-w-0">
                    <span className="block font-display text-[clamp(1.375rem,0.9rem+2.6vw,3.75rem)] leading-[0.9] font-extrabold uppercase">{active.title}</span>
                    <span className="mt-1.5 flex items-center gap-3 text-xs text-warm/75 sm:mt-2 sm:text-sm">
                      <Duration seconds={active.durationSeconds} />
                      <span aria-hidden className="h-3 w-px bg-warm/30 max-sm:hidden" />
                      <span className="max-sm:hidden">Plays here, fullscreen available</span>
                    </span>
                  </span>
                </span>
              </button>
            )}
          </div>

          <div className="lg:col-span-4 lg:flex lg:flex-col xl:col-span-3">
            <h3 className="sr-only">All trailers</h3>
            <ul className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:flex-1 lg:auto-rows-fr lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
              {trailers.map((t) => (
                <PlaylistItem
                  key={t.youtubeId}
                  t={t}
                  selected={t.youtubeId === activeId}
                  playing={playing}
                  onSelect={() => setActiveId(t.youtubeId)}
                />
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

import Image from "next/image";
import { SectionStub } from "@/components/sections/SectionStub";
import { Container } from "@/components/ui/Layout";
import { getCopy } from "@/server/content";
import { exploreHelicopter, regionArt, showcase } from "@/config/media";
import { GifPlayer } from "@/components/ui/GifPlayer";
import { game, regions } from "@/config/product";
import { isUsable } from "@/lib/media";
import { ExploreMotion } from "./ExploreMotion";

/** One accent per region tile (rgb triplets), cycling through the palette. */
const REGION_TONES = ["255 155 98", "76 201 255", "178 140 255", "255 87 154", "255 196 120", "120 160 255"];

/**
 * Leonida, told in one scroll: an oversized title the street scene slides over, the
 * frame opening to full bleed, then the state's regions and a night portrait.
 * Static composition is final-state; motion only adds the opening.
 */
export async function Explore() {
  // Wording from Admin → Content (defaults in src/config/content.ts).
  const copy = await getCopy();
  const exploreCopy = copy.explore;
  const [world, night] = showcase;
  if (!isUsable(world)) return <SectionStub id="explore" title="Explore" />;
  const pictured = "vice-city";
  const shownRegions = regions.filter((r) => r.verified);

  return (
    <ExploreMotion>
      <section id="explore" aria-labelledby="explore-title" className="relative isolate overflow-hidden bg-obsidian pt-section pb-[clamp(5rem,3rem+8vw,10rem)]">
        {/* Title fills the width; the scene rises over its lower third. */}
        <Container className="relative">
          <h2 id="explore-title" className="font-display font-extrabold uppercase">
            <span data-world-kicker className="block text-center text-[clamp(1.25rem,0.9rem+1.2vw,2.25rem)] leading-none tracking-[0.18em] text-sunset">
              {exploreCopy.kicker}
            </span>
            <span className="sr-only">{exploreCopy.title}</span>
            <span aria-hidden data-world-title className="world-title mt-[0.08em] flex justify-center leading-[0.8] tracking-[-0.02em]">
              {[...exploreCopy.title].map((ch, i) => (
                <span key={i} data-letter className="inline-block">
                  {ch}
                </span>
              ))}
            </span>
          </h2>
        </Container>

        <figure className="world-figure relative z-10">
          <div data-world-frame className="relative aspect-[4/5] overflow-hidden sm:aspect-[16/10] lg:aspect-auto lg:h-[min(92vh,60rem)]">
            <div data-world-image className="absolute inset-0">
              <Image src={world.src} alt={world.alt} fill sizes="100vw" className="object-cover object-[58%_60%] lg:object-[50%_58%]" />
            </div>
            {/* Helicopter in the city sky: flies across with scroll (ExploreMotion); hovers here without motion. */}
            {isUsable(exploreHelicopter) && (
              // Layers, one job each (ExploreMotion): flight (scroll) › hover (idle bob) › facing (turns with scroll direction).
              <div data-world-heli data-gif-rate="1" aria-hidden style={{ top: "16%", right: "10%" }} className="pointer-events-none absolute w-[clamp(8rem,24vw,22rem)] will-change-transform">
                <div data-heli-hover>
                  <div data-heli-face className="relative">
                    {/* Searchlight: a soft cone from the nose, sweeping over the city. */}
                    <span
                      data-heli-beam
                      className="absolute top-[74%] left-[68%] h-[310%] w-[90%] origin-top -translate-x-1/2 bg-[linear-gradient(180deg,rgb(255_246_225/0.42)_0%,rgb(255_236_214/0.14)_45%,transparent_92%)] [clip-path:polygon(46%_0,54%_0,100%_100%,0_100%)]"
                    />
                    {/* Static soft shadow under the body (no CSS filter on the animating canvas). */}
                    <span className="absolute inset-x-[18%] top-[58%] h-[38%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(0_0_0/0.35),transparent)]" />
                    <GifPlayer src={exploreHelicopter.src} width={exploreHelicopter.width} height={exploreHelicopter.height} className="relative h-auto w-full" />
                  </div>
                </div>
              </div>
            )}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-obsidian/85 via-obsidian/5 via-40% to-obsidian/30" />
            <figcaption data-world-caption className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 px-gutter pb-6 sm:pb-10 lg:pb-14">
              <span className="font-display text-[clamp(2.5rem,1.4rem+4.6vw,7rem)] leading-[0.85] font-extrabold uppercase">Vice City</span>
              <span className="max-w-[22rem] text-sm text-warm/80 sm:text-base">{world.caption}. One of six regions across the state of Leonida.</span>
            </figcaption>
          </div>
        </figure>

        {/* Six regions, one state: statement + summary beside the night portrait, then a tile per region. */}
        <Container data-world-regions className="mt-16 lg:mt-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-x-8">
            <div className="lg:col-span-5">
              <h3 className="font-display text-display-md leading-[0.92] font-extrabold tracking-[-0.005em]">{exploreCopy.regionsLabel}</h3>
              <p className="mt-6 max-w-[30rem] text-lead text-warm/72">{game.summary}</p>
            </div>
            {isUsable(night) && (
              <figure className="lg:col-span-6 lg:col-start-7">
                <div data-world-night className="relative aspect-[16/10] overflow-hidden rounded-media bg-midnight">
                  <Image src={night.src} alt={night.alt} fill sizes="(min-width: 64rem) 46vw, 100vw" className="object-cover object-[30%_35%]" />
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-obsidian/70 via-transparent to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-sm sm:p-5">
                    <span className="font-semibold text-warm/90">{night.caption}</span>
                    <span className="text-xs text-warm/55">Images: {night.credit}</span>
                  </figcaption>
                </div>
              </figure>
            )}
          </div>

          <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-16 lg:grid-cols-3">
            {shownRegions.map((r, i) => {
              const isPictured = r.id === pictured;
              const art = regionArt[r.id];
              const tone = REGION_TONES[i % REGION_TONES.length]!;
              return (
                <li
                  key={r.id}
                  data-region
                  style={{ "--tone": tone } as React.CSSProperties}
                  className="group relative isolate flex aspect-[4/3] items-end overflow-hidden rounded-media border border-warm/10 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-midnight)_95%,transparent),var(--color-obsidian))] p-4 transition-[transform,border-color] duration-500 ease-cinematic hover:-translate-y-1 hover:border-[rgb(var(--tone)/0.45)] sm:aspect-[16/10] sm:p-6"
                >
                  {isUsable(art) ? (
                    <>
                      <Image src={art.src} alt={art.alt} fill sizes="(min-width: 64rem) 30vw, 50vw" style={{ objectPosition: art.focus ?? "50% 50%" }} className="-z-10 object-cover transition-transform duration-700 ease-cinematic group-hover:scale-105" />
                      {/* Readability scrim with a hint of the region's tone. */}
                      <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--color-obsidian)_90%,transparent),color-mix(in_oklab,var(--color-obsidian)_25%,transparent)_55%,rgb(var(--tone)/0.12))]" />
                    </>
                  ) : (
                    <>
                      {/* Tonal glow and an outlined echo of the name: atmosphere without inventing scenery. */}
                      <span aria-hidden className="absolute -top-16 -right-16 -z-10 size-56 rounded-full bg-[radial-gradient(circle,rgb(var(--tone)/0.22),transparent_68%)] transition-opacity duration-500 group-hover:opacity-100 sm:opacity-80" />
                      <span
                        aria-hidden
                        className="absolute -top-[0.12em] -left-[0.04em] -z-10 font-display text-[clamp(3.5rem,2rem+6vw,7.5rem)] leading-none font-extrabold whitespace-nowrap text-transparent uppercase opacity-60 [-webkit-text-stroke:1px_rgb(var(--tone)/0.28)] transition-transform duration-700 ease-cinematic group-hover:translate-x-2"
                      >
                        {r.name}
                      </span>
                    </>
                  )}
                  {isPictured && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-control bg-obsidian/60 px-2.5 py-1 text-[0.6875rem] font-semibold text-sunset ring-1 ring-sunset/30 sm:top-5 sm:left-5">
                      <span aria-hidden className="size-1.5 rounded-full bg-sunset" />
                        In view
                      </span>
                  )}
                  <span aria-hidden className="absolute inset-x-4 bottom-0 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,rgb(var(--tone)),transparent)] transition-transform duration-700 ease-cinematic group-hover:scale-x-100 sm:inset-x-6" />
                  <span className="font-display text-[clamp(1.3rem,0.95rem+1.5vw,2.4rem)] leading-[0.9] font-extrabold uppercase">{r.name}</span>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>
    </ExploreMotion>
  );
}

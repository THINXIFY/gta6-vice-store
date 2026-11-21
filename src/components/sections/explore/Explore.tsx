import Image from "next/image";
import { SectionStub } from "@/components/sections/SectionStub";
import { Container } from "@/components/ui/Layout";
import { exploreCopy } from "@/config/content";
import { showcase } from "@/config/media";
import { game, regions } from "@/config/product";
import { isUsable } from "@/lib/media";
import { ExploreMotion } from "./ExploreMotion";

/**
 * Leonida, told in one scroll: an oversized title the street scene slides over, the
 * frame opening to full bleed, then the state's regions and a night portrait.
 * Static composition is final-state; motion only adds the opening.
 */
export function Explore() {
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
              <Image src={world.src} alt={world.alt} fill sizes="100vw" className="object-cover object-[62%_62%] lg:object-[50%_60%]" />
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-obsidian/85 via-obsidian/5 via-40% to-obsidian/30" />
            <figcaption data-world-caption className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 px-gutter pb-6 sm:pb-10 lg:pb-14">
              <span className="font-display text-[clamp(2.5rem,1.4rem+4.6vw,7rem)] leading-[0.85] font-extrabold uppercase">Vice City</span>
              <span className="max-w-[22rem] text-sm text-warm/80 sm:text-base">{world.caption}. One of six regions across the state of Leonida.</span>
            </figcaption>
          </div>
        </figure>

        <Container className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-5">
            <p className="max-w-[30rem] text-lead text-warm/75">{game.summary}</p>

            <h3 className="mt-12 text-sm font-semibold text-warm/55 lg:mt-16">{exploreCopy.regionsLabel}</h3>
            <ul className="mt-4 border-t border-warm/10">
              {shownRegions.map((r) => {
                const isPictured = r.id === pictured;
                return (
                  <li key={r.id} className="flex items-baseline justify-between gap-4 border-b border-warm/10 py-3">
                    <span className={isPictured ? "font-display text-[clamp(1.75rem,1.3rem+1.4vw,2.75rem)] leading-none font-extrabold uppercase" : "font-display text-[clamp(1.75rem,1.3rem+1.4vw,2.75rem)] leading-none font-extrabold text-warm/30 uppercase"}>
                      {r.name}
                    </span>
                    {isPictured && <span className="text-xs font-medium text-sunset">Pictured</span>}
                  </li>
                );
              })}
            </ul>
          </div>

          {isUsable(night) && (
            <figure className="lg:col-span-5 lg:col-start-8 lg:mt-2">
              <div data-world-night className="relative aspect-[5/4] overflow-hidden rounded-media bg-midnight sm:aspect-[16/11] lg:aspect-[4/5]">
                <Image src={night.src} alt={night.alt} fill sizes="(min-width: 64rem) 38vw, 100vw" className="object-cover object-[28%_50%]" />
              </div>
              <figcaption className="mt-3 flex justify-between gap-4 text-sm text-warm/55">
                <span>{night.caption}</span>
                <span>Images: {night.credit}</span>
              </figcaption>
            </figure>
          )}
        </Container>
      </section>
    </ExploreMotion>
  );
}

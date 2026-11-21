import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Layout";
import { getCopy } from "@/server/content";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { HeroArt, hasLicensedArt } from "./HeroArt";
import { HeroMotion } from "./HeroMotion";
import { HeroParticles } from "./HeroParticles";

/**
 * Cinematic hero. Key art fills the frame (characters, car and logo held on the right by
 * art-directed crops); copy sits in the open sky on the left over a localized shade, not a
 * full-frame darkening. Below lg the art stacks above the copy so the subjects stay visible.
 */
export async function Hero({ from: offer, currency, showTrailer = true }: { from: { edition: string; cents: number; others: string[] } | null; currency: string; showTrailer?: boolean }) {
  // Wording from Admin → Content (defaults in src/config/content.ts).
  const copy = await getCopy();
  const heroCopy = copy.hero;
  const from = offer ? formatPrice({ amount: offer.cents, currency }) : null;
  const others = offer?.others.length ? `${new Intl.ListFormat("en", { type: "conjunction" }).format(offer.others)} available.` : "";

  return (
    <HeroMotion>
      {/* Server-rendered pin spacer: ScrollTrigger pins into it instead of wrapping the section after
          hydration (wrapping re-inserts the hero image and delays LCP). */}
      <div data-hero-spacer>
      {/* Pinned element: a plain block (pinning the flex section directly made ScrollTrigger copy
          display:flex onto the spacer and shrink the hero). */}
      <div data-hero-pin>
      <section id="overview" aria-labelledby="hero-title" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-obsidian lg:justify-center">
        {/* Visual: stacked above the copy below lg, full-bleed behind it from lg */}
        <div className="relative mt-14 h-[58svh] min-h-[23rem] overflow-hidden sm:mt-16 sm:h-[62svh] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto">
          {/* Scroll camera push (desktop pin) on its own wrapper, apart from the intro and ambient zoom. */}
          <div data-hero-dolly className="absolute inset-0 origin-[50%_60%]">
            <HeroArt />
          </div>
          {/* Day to night: a tint that deepens as you scroll (opacity only). */}
          <div data-hero-night aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(32_18_70/0.62)_0%,rgb(20_12_44/0.42)_45%,color-mix(in_oklab,var(--color-obsidian)_70%,transparent)_100%)] opacity-0" />
          {/* Pointer spotlight (desktop, fine pointer): a soft light moved by transform only. */}
          <div data-hero-spot aria-hidden className="pointer-events-none absolute top-0 left-0 hidden size-[46rem] rounded-full bg-[radial-gradient(circle,rgb(255_228_242/0.16)_0%,rgb(255_170_210/0.07)_32%,transparent_66%)] opacity-0 will-change-transform lg:block" />
          <div data-depth={0.55} aria-hidden className="pointer-events-none absolute inset-0">
            <HeroParticles className="size-full" />
          </div>
          <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-[0.06]" />
          {hasLicensedArt ? (
            <>
              {/* Header legibility, top edge only */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-obsidian/60 to-transparent" />
              {/* Left-to-right shade (desktop): dark behind the copy, fully clear by the logo on the right. */}
              <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-obsidian)_94%,transparent)_0%,color-mix(in_oklab,var(--color-obsidian)_82%,transparent)_22%,color-mix(in_oklab,var(--color-obsidian)_50%,transparent)_42%,color-mix(in_oklab,var(--color-obsidian)_14%,transparent)_60%,transparent_74%)] lg:block" />
              {/* Seamless hand-off into the next section */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-b from-transparent via-obsidian/55 to-obsidian lg:h-[34%] lg:via-obsidian/35" />
            </>
          ) : (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_65%_40%,transparent_55%,color-mix(in_oklab,var(--color-obsidian)_55%,transparent)_100%)]" />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-b from-transparent via-obsidian/60 to-obsidian lg:h-2/5" />
              <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] bg-linear-to-r from-obsidian/92 via-obsidian/60 to-transparent lg:block" />
            </>
          )}
        </div>

        <Container data-hero-content className="relative z-10 -mt-24 pb-12 sm:-mt-32 md:pb-16 lg:mt-0 lg:pt-28 lg:pb-[clamp(4rem,10vh,8rem)]">
          {/* @container: the title is sized from this column's width so it always sits on one line. */}
          <div className="@container max-w-[38rem] xl:max-w-[44rem]">
            <h1 id="hero-title" data-hero-intro>
              <span className="block overflow-hidden pb-[0.05em] font-display text-[min(5.75rem,13cqi)] leading-[0.88] font-extrabold tracking-[-0.012em] whitespace-nowrap uppercase [text-shadow:0_0_42px_color-mix(in_oklab,var(--color-vice)_28%,transparent),0_2px_24px_color-mix(in_oklab,var(--color-obsidian)_45%,transparent)]">
                <span data-hero-line className="block will-change-transform">
                  {heroCopy.title}{" "}
                  <span data-handoff-anchor data-handoff-gradient className="inline-block bg-[linear-gradient(100deg,var(--color-vice),var(--color-sunset))] bg-clip-text pr-[0.04em] leading-[0.85] text-transparent [text-shadow:none]">
                    {heroCopy.titleMark}
                  </span>
                </span>
              </span>{" "}
              <span className="mt-[0.9cqi] block overflow-hidden pb-[0.05em] font-display text-[min(1.9rem,4.3cqi)] leading-none font-extrabold tracking-[0.2em] text-warm/85 uppercase">
                <span data-hero-line className="flex items-center gap-[0.6em] will-change-transform">
                  <span aria-hidden className="h-px w-[2.2em] shrink-0 bg-linear-to-r from-vice to-sunset" />
                  {heroCopy.subtitle}
                </span>
              </span>
            </h1>

            <p data-hero-intro className="mt-6 max-w-[30rem] text-lead text-warm/80 [text-shadow:0_1px_18px_color-mix(in_oklab,var(--color-obsidian)_60%,transparent)]">
              {heroCopy.description}
            </p>

            <div data-hero-intro data-hero-ctas className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-5">
              <Link
                href={heroCopy.primaryCta.href}
                className={cn(
                  "cta-sheen group relative inline-flex h-16 items-center justify-center gap-3 overflow-hidden rounded-control px-10 text-lg font-bold text-obsidian max-sm:w-full",
                  "bg-[linear-gradient(100deg,var(--color-vice)_0%,var(--color-blend)_45%,var(--color-sunset)_100%)] bg-[length:160%_100%] bg-left",
                  "shadow-[0_14px_44px_-10px_color-mix(in_oklab,var(--color-vice)_75%,transparent),0_0_0_1px_color-mix(in_oklab,var(--color-warm)_18%,transparent)_inset]",
                  "transition-[background-position,transform,box-shadow] duration-500 ease-swift hover:-translate-y-0.5 hover:bg-right hover:shadow-[0_20px_56px_-10px_color-mix(in_oklab,var(--color-blend)_90%,transparent),0_0_0_1px_color-mix(in_oklab,var(--color-warm)_30%,transparent)_inset] active:translate-y-0",
                )}
              >
                {heroCopy.primaryCta.label}
                <ArrowRight aria-hidden className="size-5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
              </Link>
              {showTrailer && (
              <a href={heroCopy.secondaryCta.href} className="group inline-flex items-center gap-3.5 rounded-control pr-2 font-semibold">
                <span className="grid size-14 place-items-center rounded-full bg-warm/12 ring-1 ring-warm/20 backdrop-blur-[2px] transition-colors duration-500 ease-swift group-hover:bg-warm group-hover:text-obsidian">
                  <Play aria-hidden className="ml-0.5 size-4.5 fill-current" />
                </span>
                {heroCopy.secondaryCta.label}
              </a>
              )}
            </div>
            {from && (
              <p data-hero-intro className="mt-4 text-sm text-warm/70">
                {offer!.edition} from <span className="font-semibold text-warm">{from}</span>. {others}
              </p>
            )}

          </div>
        </Container>

        {/* Scroll cue: the line fills as scrolling starts, then the cue fades. */}
        <div data-hero-cue aria-hidden className="pointer-events-none absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
          <span className="text-[0.6875rem] font-semibold tracking-[0.2em] text-warm/55 uppercase">Scroll</span>
          <span className="relative h-14 w-px overflow-hidden bg-warm/15">
            <span data-hero-cue-fill className="absolute inset-0 origin-top scale-y-[0.3] bg-linear-to-b from-vice to-sunset" />
          </span>
        </div>
      </section>
      </div>
      </div>
      {/* Scroll distance for the desktop pin, reserved from first paint (globals.css); ScrollTrigger never touches it. */}
      <div aria-hidden data-hero-pin-distance />
    </HeroMotion>
  );
}

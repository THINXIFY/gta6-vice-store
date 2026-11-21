import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Layout";
import { heroCopy } from "@/config/content";
import { game, platforms } from "@/config/product";
import { site } from "@/config/site";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { HeroArt, hasLicensedArt } from "./HeroArt";
import { HeroMotion } from "./HeroMotion";
import { HeroParticles } from "./HeroParticles";

/** Factual status line built only from verified config. */
function statusLine(): string | null {
  const names = platforms.filter((p) => p.verified && p.available).map((p) => p.name);
  if (!names.length) return null;
  const list = new Intl.ListFormat("en", { type: "conjunction" }).format(names);
  const { releaseDate, releaseStatus } = game;
  if (releaseStatus.verified && releaseStatus.value === "available" && releaseDate.verified) {
    const date = new Intl.DateTimeFormat(site.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(releaseDate.value));
    return `Released ${date} for ${list}`;
  }
  return `For ${list}`;
}

/**
 * Cinematic hero. Key art fills the frame (characters, car and logo held on the right by
 * art-directed crops); copy sits in the open sky on the left over a localized shade, not a
 * full-frame darkening. Below lg the art stacks above the copy so the subjects stay visible.
 */
export function Hero({ fromCents }: { fromCents?: number | null }) {
  const status = statusLine();
  const from = fromCents ? formatPrice({ amount: fromCents, currency: "USD" }) : null;

  return (
    <HeroMotion>
      <section id="overview" aria-labelledby="hero-title" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-obsidian lg:justify-center">
        {/* Visual: stacked above the copy below lg, full-bleed behind it from lg */}
        <div className="relative mt-14 h-[58svh] min-h-[23rem] overflow-hidden sm:mt-16 sm:h-[62svh] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto">
          <HeroArt />
          <div data-depth={0.55} aria-hidden className="pointer-events-none absolute inset-0">
            <HeroParticles className="size-full" />
          </div>
          <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-[0.06]" />
          {hasLicensedArt ? (
            <>
              {/* Header legibility, top edge only */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-obsidian/60 to-transparent" />
              {/* Localized shade behind the copy (desktop); the neon right side stays untouched */}
              <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(52%_72%_at_13%_55%,rgb(8_8_13/0.78)_0%,rgb(8_8_13/0.5)_42%,transparent_76%)] lg:block" />
              {/* Seamless hand-off into the next section */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-b from-transparent via-obsidian/55 to-obsidian lg:h-[34%] lg:via-obsidian/35" />
            </>
          ) : (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_65%_40%,transparent_55%,rgb(8_8_13/0.55)_100%)]" />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-b from-transparent via-obsidian/60 to-obsidian lg:h-2/5" />
              <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] bg-linear-to-r from-obsidian/92 via-obsidian/60 to-transparent lg:block" />
            </>
          )}
        </div>

        <Container data-hero-content className="relative z-10 -mt-24 pb-12 sm:-mt-32 md:pb-16 lg:mt-0 lg:pt-28 lg:pb-[clamp(4rem,10vh,8rem)]">
          <div className="max-w-[36rem] xl:max-w-[40rem]">
            <p data-hero-intro className="flex items-center gap-3 text-sm font-semibold text-sunset">
              <span aria-hidden className="h-px w-10 bg-linear-to-r from-vice to-sunset" />
              {heroCopy.eyebrow}
            </p>

            <h1 id="hero-title" data-hero-intro className="mt-5">
              <span className="block font-display text-[clamp(3.75rem,1.9rem+7.2vw,9.25rem)] leading-[0.84] font-extrabold tracking-[-0.012em] uppercase [text-shadow:0_0_42px_rgb(255_87_154/0.28),0_2px_24px_rgb(8_8_13/0.45)]">
                {heroCopy.headlineLines.map((line) => (
                  <span key={line} className="block overflow-hidden pb-[0.05em]">
                    <span data-hero-line className="block will-change-transform">
                      {line}
                    </span>
                  </span>
                ))}
              </span>
              <span data-hero-product className="mt-4 block font-display text-[clamp(1.05rem,0.85rem+0.85vw,1.65rem)] leading-none font-extrabold tracking-[0.24em] text-warm/90 uppercase">
                {heroCopy.product}
              </span>
            </h1>

            <p data-hero-intro className="mt-6 max-w-[30rem] text-lead text-warm/80 [text-shadow:0_1px_18px_rgb(8_8_13/0.6)]">
              {heroCopy.description}
            </p>

            <div data-hero-intro data-hero-ctas className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-5">
              <Link
                href={heroCopy.primaryCta.href}
                className={cn(
                  "cta-sheen group relative inline-flex h-16 items-center justify-center gap-3 overflow-hidden rounded-control px-10 text-lg font-bold text-obsidian max-sm:w-full",
                  "bg-[linear-gradient(100deg,var(--color-vice)_0%,#ff7a7c_45%,var(--color-sunset)_100%)] bg-[length:160%_100%] bg-left",
                  "shadow-[0_14px_44px_-10px_rgb(255_87_154/0.75),0_0_0_1px_rgb(255_244_235/0.18)_inset]",
                  "transition-[background-position,transform,box-shadow] duration-500 ease-swift hover:-translate-y-0.5 hover:bg-right hover:shadow-[0_20px_56px_-10px_rgb(255_120_120/0.9),0_0_0_1px_rgb(255_244_235/0.3)_inset] active:translate-y-0",
                )}
              >
                {heroCopy.primaryCta.label}
                <ArrowRight aria-hidden className="size-5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
              </Link>
              <a href={heroCopy.secondaryCta.href} className="group inline-flex items-center gap-3.5 rounded-control pr-2 font-semibold">
                <span className="grid size-14 place-items-center rounded-full bg-warm/12 ring-1 ring-warm/20 backdrop-blur-[2px] transition-colors duration-500 ease-swift group-hover:bg-warm group-hover:text-obsidian">
                  <Play aria-hidden className="ml-0.5 size-4.5 fill-current" />
                </span>
                {heroCopy.secondaryCta.label}
              </a>
            </div>
            {from && (
              <p data-hero-intro className="mt-4 text-sm text-warm/70">
                Standard Edition from <span className="font-semibold text-warm">{from}</span>. Ultimate Edition available.
              </p>
            )}

            <div data-hero-intro className="mt-9 border-t border-warm/12 pt-5 text-sm lg:mt-11">
              {status && <p className="text-warm/85">{status}</p>}
              <p className="mt-1 text-warm/50">{site.shortDisclaimer}</p>
            </div>
          </div>
        </Container>
      </section>
    </HeroMotion>
  );
}

import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Layout";
import { mediaCredits, trailerEmbeds, trailers } from "@/config/media";
import { isUsable } from "@/lib/media";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Media credits",
  description: "Credits for the artwork, Grand Theft Auto VI imagery and trailers shown on this store, with copyright and trademark notices.",
  alternates: { canonical: "/credits" },
};

const shown = mediaCredits.filter((c) => isUsable(c.item));
// Official artwork carries a source link; everything else was made for this store.
const official = shown.filter((c) => c.item.sourceUrl);
const own = shown.filter((c) => !c.item.sourceUrl);

function ArtList({ entries }: { entries: typeof shown }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-media bg-warm/8">
      {entries.map(({ item, title, usedIn, note }) => (
        <li key={item.id} className="grid grid-cols-[6.5rem_1fr] items-center gap-5 bg-obsidian p-4 sm:grid-cols-[9rem_1fr] sm:gap-7 sm:p-5">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-midnight">
            <Image src={item.src} alt={item.alt} fill sizes="9rem" className="object-cover" />
          </div>
          <div className="min-w-0 text-sm">
            <p className="text-base font-semibold">{title}</p>
            <p className="mt-1 text-warm/60">Used in: {usedIn}</p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-warm/60">
              <span>© {item.credit}</span>
              {item.sourceUrl && <SourceLink href={item.sourceUrl}>Source</SourceLink>}
            </p>
            {note && <p className="mt-1 text-xs text-warm/45">{note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Block({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-8 border-t border-warm/10 py-14 lg:grid-cols-12 lg:gap-8 lg:py-20">
      <div className="lg:col-span-4">
        <h2 id={id} className="font-display text-display-md font-extrabold tracking-[-0.005em]">
          {title}
        </h2>
        {intro && <p className="mt-4 max-w-[24rem] text-sm leading-relaxed text-warm/60">{intro}</p>}
      </div>
      <div className="lg:col-span-8">{children}</div>
    </section>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sunset underline-offset-4 hover:underline">
      {children}
      <ArrowUpRight aria-hidden className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default function CreditsPage() {
  return (
    <>
      <main id="main" className="relative isolate overflow-hidden bg-obsidian">
        <div aria-hidden className="bg-sunset-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] rotate-180 opacity-50" />
        <Container className="pt-32 pb-6 lg:pt-44">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-warm/60 transition-colors hover:text-warm">
            <ArrowLeft aria-hidden className="size-4" />
            Back to the store
          </Link>
          <h1 className="mt-8 font-display text-display-xl font-extrabold tracking-[-0.01em] uppercase">Media credits</h1>
          <p className="mt-6 max-w-[40rem] text-lead text-warm/72">
            Grand Theft Auto VI imagery and trailers belong to Rockstar Games and Take-Two Interactive. We credit them here, alongside the
            artwork made for this store.
          </p>
        </Container>

        <Container className="mt-12">
          {own.length > 0 && (
            <Block id="credits-own" title="Store artwork" intro={`Original artwork created for ${site.name}.`}>
              <ArtList entries={own} />
            </Block>
          )}
          {official.length > 0 && (
            <Block id="credits-official" title="Game artwork" intro="Official Grand Theft Auto VI artwork and screenshots, with where each was published.">
              <ArtList entries={official} />
            </Block>
          )}
          {!shown.length && (
            <Block id="credits-artwork" title="Artwork">
              <p className="text-warm/65">Imagery on this site is original illustration.</p>
            </Block>
          )}

          {trailerEmbeds && (
            <Block id="credits-video" title="Trailers" intro="Played through YouTube's embedded player from Rockstar Games' official channel. Nothing is re-hosted.">
              <ul className="grid gap-3 text-sm">
                {trailers.map((t) => (
                  <li key={t.youtubeId} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-warm/8 pb-3">
                    <span className="font-semibold">Grand Theft Auto VI {t.title}</span>
                    <span className="flex gap-4 text-warm/60">
                      © Rockstar Games
                      <SourceLink href={`https://www.youtube.com/watch?v=${t.youtubeId}`}>YouTube</SourceLink>
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          <Block id="credits-legal" title="Copyright and trademarks">
            <div className="grid max-w-[44rem] gap-4 leading-relaxed text-warm/72">
              <p>
                Grand Theft Auto, Grand Theft Auto VI, Rockstar Games and related marks and logos are trademarks of Take-Two Interactive Software, Inc. Game
                imagery, trailers and characters are © Rockstar Games and Take-Two Interactive Software, Inc.
              </p>
              <p>
                PlayStation and PS5 are trademarks of Sony Interactive Entertainment Inc. Xbox and Xbox Series X|S are trademarks of the Microsoft group of
                companies. YouTube is a trademark of Google LLC.
              </p>
              <p className="text-sm text-warm/55">
                Site typefaces: Big Shoulders and Hanken Grotesk (SIL Open Font License, via Google Fonts). Icons: Lucide (ISC License). Drawn illustrations are
                original work for this site.
              </p>
            </div>
          </Block>

        </Container>
      </main>
      <Footer base="/" />
    </>
  );
}

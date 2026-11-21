"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { getLenis, scrollToHash } from "@/components/motion/SmoothScroll";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { Price } from "@/components/ui/Price";
import { compareCopy } from "@/config/content";
import { editionContents } from "@/config/product";
import type { Edition, EditionId } from "@/config/types";
import { cn } from "@/lib/utils";
import { EditionArt } from "./EditionArt";
import { usePurchase } from "./PurchaseContext";

/** Ultimate first (left), Standard second, per the brief. */
const ORDER: EditionId[] = ["ultimate", "standard"];
const allItems = editionContents.categories.flatMap((c) => c.items);

/** Edition identities: sunset for Ultimate, dusk purple for Standard. */
const THEME = {
  ultimate: {
    panel: "bg-[linear-gradient(180deg,#3d1732_0%,#24101f_42%,#150c15_100%)]",
    glow: "bg-[radial-gradient(80%_60%_at_50%_0%,rgb(255_155_98/0.28),transparent_70%)]",
    tick: "text-sunset",
    choose: "bg-[linear-gradient(100deg,var(--color-vice)_0%,#ff7a7c_45%,var(--color-sunset)_100%)] text-obsidian hover:brightness-110",
  },
  standard: {
    panel: "bg-[linear-gradient(180deg,#2b2152_0%,#1b1634_42%,#110f1e_100%)]",
    glow: "bg-[radial-gradient(80%_60%_at_50%_0%,rgb(178_140_255/0.22),transparent_70%)]",
    tick: "text-lavender",
    choose: "bg-lavender text-obsidian hover:bg-[#c4a6ff]",
  },
} as const;

function Contents({ edition, id }: { edition: Edition; id: string }) {
  const [open, setOpen] = useState(false);
  const theme = THEME[edition.id];
  const included = allItems.filter((i) => (i.in as readonly EditionId[]).includes(edition.id)).length;
  const summary = included === allItems.length ? `All ${allItems.length} items` : `${included} of ${allItems.length} items`;

  return (
    <div className="mt-8 border-t border-warm/10 pt-6">
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-semibold">What’s included</h4>
        <span className="text-sm text-warm/60 max-lg:hidden">{summary}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="-mr-2 inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm text-warm/70 hover:bg-warm/8 lg:hidden"
        >
          {summary}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
          <span className="sr-only">{open ? "Hide" : "Show"} contents of {edition.name}</span>
        </button>
      </div>

      <div id={id} className={cn("mt-5 grid gap-6", open ? "grid" : "hidden", "lg:grid")}>
        {editionContents.categories.map((cat) => (
          <div key={cat.id}>
            <h5 className="text-xs font-semibold text-warm/50">{cat.label}</h5>
            <ul className="mt-2.5 grid gap-2">
              {cat.items.map((item) => {
                const has = (item.in as readonly EditionId[]).includes(edition.id);
                return (
                  <li key={item.name} className={cn("flex items-start gap-3 text-[0.9375rem] leading-snug", !has && "text-warm/35")}>
                    {has ? (
                      <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", theme.tick)} strokeWidth={2.75} />
                    ) : (
                      <X aria-hidden className="mt-0.5 size-4 shrink-0 text-warm/25" strokeWidth={2.25} />
                    )}
                    <span className={cn(!has && "line-through decoration-warm/25")}>{item.name}</span>
                    <span className="sr-only">{has ? "(included)" : "(not included)"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ edition, onChoose }: { edition: Edition; onChoose: (id: EditionId) => void }) {
  const { editionId, platformId } = usePurchase();
  const selected = edition.id === editionId;
  const theme = THEME[edition.id];

  return (
    <article
      aria-labelledby={`compare-${edition.id}`}
      className={cn(
        "relative isolate flex flex-col overflow-hidden rounded-media outline-2 -outline-offset-2 transition-[outline-color] duration-500",
        theme.panel,
        selected ? "outline-sunset/80" : "outline-warm/8",
      )}
    >
      <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 -z-10 h-2/3", theme.glow)} />
      <div className="relative aspect-video overflow-hidden">
        <EditionArt edition={edition.id} platform={platformId} sizes="(min-width: 48rem) 45vw, 100vw" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-black/25" />
        {selected && (
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-control bg-obsidian/80 px-3 py-1.5 text-xs font-semibold">
            <Check aria-hidden className="size-3.5 text-sunset" strokeWidth={3} />
            Your selection
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-8 md:p-6 lg:p-10">
        <p className="text-sm text-warm/60">Grand Theft Auto VI</p>
        <h3 id={`compare-${edition.id}`} className="mt-1 font-display text-[clamp(2rem,1rem+2.2vw,3.75rem)] leading-[0.9] font-extrabold uppercase">
          {edition.name}
        </h3>
        <p className="mt-4 max-w-[30rem] leading-relaxed text-warm/72">{edition.summary}</p>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <p className="min-h-6 text-lg font-semibold">
            <Price price={edition.prices[platformId]} className="text-base" />
          </p>
          <button
            type="button"
            onClick={() => onChoose(edition.id)}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-6 text-sm font-semibold transition-[filter,background-color] duration-300 max-sm:w-full",
              selected ? "bg-warm text-obsidian hover:bg-white" : theme.choose,
            )}
          >
            {selected && <Check aria-hidden className="size-4" strokeWidth={2.75} />}
            {selected ? `Continue with ${edition.name}` : `Choose ${edition.name}`}
          </button>
        </div>

        {editionContents.verified && <Contents edition={edition} id={`contents-${edition.id}`} />}
      </div>
    </article>
  );
}

/**
 * Edition comparison: two editorial panels with verified contents (Rockstar store,
 * rendered check/cross marks). Selection and prices are shared with the configurator;
 * choosing returns the visitor to it.
 */
export function CompareEditions() {
  const { platform, setEdition, editions, platforms } = usePurchase();

  const choose = (id: EditionId) => {
    setEdition(id);
    getLenis()?.start();
    scrollToHash("#editions");
    document.querySelector<HTMLInputElement>(`[data-edition-radio="${id}"]`)?.focus({ preventScroll: true });
  };

  const ordered = ORDER.map((id) => editions.find((e) => e.id === id)).filter((e): e is Edition => Boolean(e));

  return (
    <section id="compare" aria-labelledby="compare-title" className="relative isolate bg-band py-section">
      <Glow tone="lavender" className="-right-56 top-16 size-[46rem]" strength={0.16} speed={0.45} />
      <Glow tone="vice" className="-left-48 bottom-0 size-[38rem]" strength={0.11} speed={0.3} />
      <Container>
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Display reveal as="h2" id="compare-title" size="md" caps={false} className="tracking-[-0.005em]">
              {compareCopy.heading}
            </Display>
            <p className="mt-3 font-display text-title font-extrabold text-warm/70">{compareCopy.subheading}</p>
          </div>
          <div className="lg:col-span-5">
            <p className="max-w-[28rem] text-warm/70">{compareCopy.lead}</p>
            {platforms.length > 1 && (
              <p className="mt-3 text-sm text-warm/55">
                Prices shown for <span className="font-semibold text-warm/85">{platform.name}</span>.
              </p>
            )}
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-16 lg:gap-8">
          {ordered.map((e) => (
            <Panel key={e.id} edition={e} onChoose={choose} />
          ))}
        </div>
      </Container>
    </section>
  );
}

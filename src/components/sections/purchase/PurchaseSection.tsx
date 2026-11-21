"use client";

import { Fragment } from "react";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { Price } from "@/components/ui/Price";
import { useCopy } from "@/components/ContentProvider";
import { useCatalog } from "@/components/CatalogProvider";
import { game, purchaseDetails } from "@/config/product";
import { site } from "@/config/site";
import { checkoutAvailable } from "@/lib/checkout";
import { offeredAssets } from "@/lib/orders/methods";

import { cn } from "@/lib/utils";
import { BuyButton } from "./BuyButton";
import { EditionArt, hasEditionArt } from "./EditionArt";
import { usePurchase } from "./PurchaseContext";

const focusRing =
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-lavender has-[:focus-visible]:outline-solid";

function releaseLine() {
  const { releaseDate, releaseStatus } = game;
  if (!releaseDate.verified) return null;
  const date = new Intl.DateTimeFormat(site.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(releaseDate.value));
  return releaseStatus.verified && releaseStatus.value === "available" ? `Out now. Released ${date}.` : `Releases ${date}.`;
}

function ArtPanel() {
  const { editionId, platformId, edition, platform, editions } = usePurchase();
  const { product } = useCatalog();
  // Supplied key art already carries its own title, so the drawn title and overlays step aside.
  const supplied = hasEditionArt(editions.map((e) => e.id), platformId);
  const [label, suffix] = /^(.*) Edition$/.test(edition.name) ? [edition.name.replace(/ Edition$/, ""), "Edition"] : [edition.name, ""];
  return (
    <figure
      role="img"
      aria-label={`Artwork: ${edition.name} for ${platform.name}`}
      className={cn(
        "relative isolate overflow-hidden rounded-media bg-midnight",
        supplied ? "aspect-video lg:aspect-square" : "aspect-[5/4] sm:aspect-[16/11] lg:aspect-[4/5]",
      )}
    >
      {editions.map((e) => (
        <div
          key={e.id}
          aria-hidden
          className={cn(
            "absolute inset-0 transition-[opacity,scale] duration-1000 ease-cinematic",
            e.id === editionId ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
          )}
        >
          <EditionArt edition={e.id} platform={platformId} sizes="(min-width: 64rem) 55vw, 100vw" />
        </div>
      ))}
      {!supplied && (
        <>
          <div aria-hidden className="grain pointer-events-none absolute inset-0" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-b from-transparent to-obsidian/85" />
        </>
      )}

      <div aria-hidden className="absolute inset-x-0 top-0 flex items-center justify-between p-5 text-sm sm:p-7">
        <span key={platformId} className="swap-in rounded-control bg-obsidian/70 px-3.5 py-1.5 font-medium">
          For {platform.name}
        </span>
      </div>
      <div aria-hidden className={cn("absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-9", supplied && "hidden")}>
        <p className="font-display text-sm font-extrabold tracking-[0.14em] text-warm/80 uppercase">{product.title}</p>
        <p key={editionId} className="swap-in mt-1 font-display text-[clamp(2.25rem,1.4rem+3.4vw,4.5rem)] leading-[0.9] font-extrabold uppercase">
          {label}
          {suffix && <span className="block text-warm/55">{suffix}</span>}
        </p>
      </div>
    </figure>
  );
}

function PlatformPicker() {
  const { platformId, setPlatform, platforms } = usePurchase();
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-warm/80">Platform</legend>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-control border border-warm/12 p-1">
        {platforms.map((p) => {
          const selected = p.id === platformId;
          return (
            <label
              key={p.id}
              className={cn(
                "relative flex h-12 items-center justify-center rounded-control px-3 text-center text-sm font-semibold transition-colors duration-300 sm:text-[0.9375rem]",
                focusRing,
                !p.available && "cursor-not-allowed text-warm/30 line-through",
                p.available && (selected ? "bg-warm text-obsidian" : "cursor-pointer text-warm/70 hover:bg-warm/8 hover:text-warm"),
              )}
            >
              <input
                type="radio"
                name="platform"
                value={p.id}
                checked={selected}
                disabled={!p.available}
                onChange={() => setPlatform(p.id)}
                className="sr-only"
              />
              {p.name}
              {!p.available && <span className="sr-only"> (unavailable)</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function EditionPicker() {
  const { editionId, platformId, setEdition, editions } = usePurchase();
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-warm/80">Edition</legend>
      <div className="mt-3 grid gap-3">
        {editions.map((e) => {
          const selected = e.id === editionId;
          return (
            <label
              key={e.id}
              className={cn(
                "group relative grid cursor-pointer grid-cols-[auto_1fr] gap-x-4 rounded-2xl border p-5 transition-colors duration-300 sm:grid-cols-[auto_1fr_auto] lg:grid-cols-[auto_1fr] xl:grid-cols-[auto_1fr_auto]",
                focusRing,
                selected ? "border-sunset/70 bg-sunset/[0.06]" : "border-warm/12 hover:border-warm/30",
              )}
            >
              <input
                type="radio"
                name="edition"
                value={e.id}
                checked={selected}
                onChange={() => setEdition(e.id)}
                data-edition-radio={e.id}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-1 grid size-5 place-items-center rounded-full border-2 transition-colors duration-300",
                  selected ? "border-sunset" : "border-warm/30 group-hover:border-warm/55",
                )}
              >
                <span className={cn("size-2.5 rounded-full bg-sunset transition-transform duration-300 ease-cinematic", selected ? "scale-100" : "scale-0")} />
              </span>
              <span>
                <span className="block text-lg leading-snug font-semibold">{e.name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-warm/60">{e.summary}</span>
              </span>
              <span className="col-start-2 mt-3 text-sm font-semibold sm:col-start-3 sm:mt-0.5 sm:text-right lg:col-start-2 lg:mt-3 lg:text-left xl:col-start-3 xl:mt-0.5 xl:text-right">
                <Price price={e.prices[platformId]} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function OrderSummary() {
  const { edition, platform, price } = usePurchase();
  const { product } = useCatalog();
  const details = purchaseDetails.filter((d) => d.verified && d.value);
  return (
    <div className="mt-10 border-t border-warm/10 pt-6">
      <h3 className="sr-only">Order summary</h3>
      <dl aria-live="polite" className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-warm/55">Game</dt>
        <dd className="text-right">{product.title}</dd>
        <dt className="text-warm/55">Edition</dt>
        <dd className="text-right">{edition.name}</dd>
        <dt className="text-warm/55">Platform</dt>
        <dd className="text-right">{platform.name}</dd>
        {details.map((d) => (
          <Fragment key={d.id}>
            <dt className="text-warm/55">{d.label}</dt>
            <dd className="text-right">{d.value}</dd>
          </Fragment>
        ))}
        <dt className="mt-4 self-end text-base font-semibold">Total</dt>
        <dd className="mt-4 min-h-10 text-right font-display text-[2.25rem] leading-none font-extrabold">
          <Price price={price} className={price?.amount == null ? "font-sans text-base font-semibold" : undefined} />
        </dd>
      </dl>
    </div>
  );
}

/** `notes`: verified reassurance lines, passed in from the server (policy copy stays server-only). */
export function PurchaseSection({ notes = [] }: { notes?: string[] }) {
  // Wording from Admin → Content (defaults in src/config/content.ts).
  const copy = useCopy();
  const purchaseCopy = copy.purchase;
  // "Pay with USDT, BTC, ETH and BNB. Guest checkout." from the methods enabled in Admin → Wallets.
  const coins = offeredAssets(useCatalog().methods).map((a) => a.id);
  const payWith = coins.length ? `Pay with ${new Intl.ListFormat("en", { type: "conjunction" }).format(coins)}. Guest checkout.` : "Guest checkout.";
  const { edition } = usePurchase();
  const release = releaseLine();

  return (
    <section id="editions" aria-labelledby="purchase-title" className="relative isolate scroll-mt-16 bg-obsidian py-section lg:scroll-mt-20">
      <Glow tone="vice" className="-left-64 top-[6%] size-[52rem]" strength={0.2} speed={0.5} />
      <Glow tone="electric" className="-right-48 -top-24 size-[36rem]" strength={0.1} speed={0.3} />
      <Container className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:gap-x-24">
        <div className="lg:col-start-2 lg:row-start-1">
          {/* Landing spot for the hero "VI" hand-off (HeroMotion); decorative. */}
          <p aria-hidden data-handoff-target className="mb-3 inline-block bg-[linear-gradient(100deg,var(--color-vice),var(--color-sunset))] bg-clip-text pr-[0.04em] font-display text-[clamp(3.5rem,2.6rem+3vw,5.5rem)] leading-[0.85] font-extrabold text-transparent">
            VI
          </p>
          <Display reveal as="h2" id="purchase-title" size="md" caps={false} className="tracking-[-0.005em]">
            {purchaseCopy.heading}
          </Display>
          {release && <p className="mt-4 text-warm/65">{release}</p>}
        </div>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-28">
            <ArtPanel />
          </div>
        </div>

        <div id="purchase-panel" className="lg:col-start-2">
          <div className="grid gap-8">
            <PlatformPicker />
            <EditionPicker />
          </div>
          <OrderSummary />
          <BuyButton label={`Buy ${edition.name}`} describedBy="checkout-status" className="mt-7 h-15 w-full text-base" />
          <p id="checkout-status" className="mt-3 text-center text-sm text-warm/55">
            {checkoutAvailable ? payWith : purchaseCopy.checkoutClosed}
          </p>
          {notes.length > 0 && (
            <ul className="mt-8 grid gap-3 border-t border-warm/10 pt-6 text-sm text-warm/65">
              {notes.map((n) => (
                <li key={n} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sunset" />
                  {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}

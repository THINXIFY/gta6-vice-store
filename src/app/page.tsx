import { Fragment, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { PageMotion } from "@/components/motion/PageMotion";
import { NeonRule } from "@/components/ui/Atmosphere";
import { Assurance, purchaseNotes } from "@/components/sections/assurance/Assurance";
import { Characters } from "@/components/sections/characters/Characters";
import { Explore } from "@/components/sections/explore/Explore";
import { Faq } from "@/components/sections/faq/Faq";
import { Gallery } from "@/components/sections/gallery/Gallery";
import { Hero } from "@/components/sections/hero/Hero";
import { ClosingCta } from "@/components/sections/purchase/ClosingCta";
import { CompareEditions } from "@/components/sections/purchase/CompareEditions";
import { PurchaseProvider } from "@/components/sections/purchase/PurchaseContext";
import { PurchaseSection } from "@/components/sections/purchase/PurchaseSection";
import { StickyPurchaseBar } from "@/components/sections/purchase/StickyPurchaseBar";
import { Trailers } from "@/components/sections/trailers/Trailers";
import { StructuredData } from "@/components/seo/StructuredData";
import { BLOCKS, type BlockId } from "@/lib/blocks";
import type { Catalog } from "@/lib/catalog";
import { contentPreview, mediaPreview } from "@/lib/media";
import { getCatalog } from "@/server/catalog";
import { getHome } from "@/server/home";
import { getContent } from "@/server/content";

/** "Standard Edition from $19.00. Ultimate Edition available." from the live catalogue. */
function fromPrice(catalog: Catalog) {
  const available = new Set(catalog.platforms.filter((p) => p.available).map((p) => p.id));
  const lowest = (id: string) => {
    const cents = Object.entries(catalog.prices).filter(([k, v]) => k.startsWith(id + ":") && available.has(k.slice(id.length + 1)) && typeof v === "number" && v > 0);
    return cents.length ? Math.min(...cents.map(([, v]) => v as number)) : null;
  };
  const priced = catalog.editions.map((e) => ({ name: e.name, cents: lowest(e.id) })).filter((e): e is { name: string; cents: number } => e.cents !== null);
  const cheapest = priced.sort((a, b) => a.cents - b.cents)[0];
  return cheapest ? { edition: cheapest.name, cents: cheapest.cents, others: priced.filter((e) => e !== cheapest).map((e) => e.name) } : null;
}

/**
 * The home page, assembled from this client's blocks (Admin → Homepage; defaults in
 * src/brand/home.ts). A divider separates blocks of different kinds (buying, world, media,
 * trust), so any order keeps a clean rhythm.
 */
export default async function Home() {
  const [catalog, home, content] = await Promise.all([getCatalog(), getHome(), getContent()]);
  const on = new Set(home.filter((b) => b.enabled).map((b) => b.id));

  const render: Record<BlockId, () => ReactNode> = {
    hero: () => <Hero from={fromPrice(catalog)} currency={catalog.currency} showTrailer={on.has("trailers")} />,
    editions: () => <PurchaseSection notes={purchaseNotes(content.notes)} />,
    compare: () => <CompareEditions />,
    explore: () => <Explore />,
    characters: () => <Characters />,
    trailers: () => <Trailers />,
    gallery: () => <Gallery />,
    assurance: () => <Assurance compareLink={on.has("compare")} />,
    faq: () => <Faq />,
    closing: () => <ClosingCta />,
  };

  const blocks = home.filter((b) => b.enabled && b.id !== "hero");
  return (
    <PageMotion>
      <main id="main" className="overflow-x-clip" data-media-preview={mediaPreview || undefined} data-content-preview={contentPreview || undefined}>
        <StructuredData catalog={catalog} />
        {render.hero()}

        {/* Selection is shared from the configurator through to the closing CTA. */}
        <PurchaseProvider catalog={catalog}>
          {blocks.map((b, i) => {
            const prev = blocks[i - 1];
            const divider = prev && BLOCKS[prev.id].group !== BLOCKS[b.id].group;
            return (
              <Fragment key={b.id}>
                {divider && <NeonRule />}
                {render[b.id]()}
              </Fragment>
            );
          })}
          <StickyPurchaseBar />
        </PurchaseProvider>
      </main>
      <Footer />
    </PageMotion>
  );
}

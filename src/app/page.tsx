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
import { contentPreview, mediaPreview } from "@/lib/media";
import { getCatalog } from "@/server/catalog";

export default async function Home() {
  const catalog = await getCatalog();
  const onSale = Object.values(catalog.prices).filter((c): c is number => typeof c === "number" && c > 0);
  const fromCents = onSale.length ? Math.min(...onSale) : null;
  return (
    <PageMotion>
      <main id="main" className="overflow-x-clip" data-media-preview={mediaPreview || undefined} data-content-preview={contentPreview || undefined}>
        <StructuredData catalog={catalog} />
        <Hero fromCents={fromCents} />

        {/* Selection is shared from the configurator through to the closing CTA. */}
        <PurchaseProvider catalog={catalog}>
          <PurchaseSection notes={purchaseNotes} />
          <CompareEditions />
          <NeonRule />
          <Explore />
          <Characters />
          <NeonRule />
          <Trailers />
          <Gallery />
          <NeonRule />
          <Assurance />
          <Faq />
          <NeonRule />
          <ClosingCta />
          <StickyPurchaseBar />
        </PurchaseProvider>
      </main>
      <Footer />
    </PageMotion>
  );
}

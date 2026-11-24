import { trailerEmbeds, trailers } from "@/config/media";
import { publishedFaq } from "@/components/sections/faq/Faq";
import { getContent } from "@/server/content";
import { game } from "@/config/product";
import { brand } from "@/brand/brand";
import { site } from "@/config/site";
import type { Catalog } from "@/lib/catalog";
import { checkoutOpen } from "@/lib/checkout";

/**
 * JSON-LD that mirrors visible, verified content only. Each entity is gated on what is true
 * today, so markup can never get ahead of the business:
 *  - WebSite + Organization (the store's brand: name, URL, logo): always. Legal name and email
 *    are added only once confirmed.
 *  - VideoGame: verified game facts. VideoObject: the official trailers shown on the page.
 *  - FAQPage: verified answers only.
 *  - Product + Offer: only while live checkout is open (real stock, rights, policies), from
 *    the live catalogue prices. Never ratings or reviews.
 */
export async function StructuredData({ catalog }: { catalog: Catalog }) {
  const { faq, published } = await getContent();
  const id = (frag: string) => `${site.url}/#${frag}`;
  const graph: Record<string, unknown>[] = [];

  // Google's logo guideline: at least 112×112, legible on white; the square icon is.
  const organization = {
    "@type": "Organization",
    "@id": id("organization"),
    name: site.name,
    url: site.url,
    logo: { "@type": "ImageObject", "@id": id("logo"), url: `${site.url}/brand/icon-512.png`, width: 512, height: 512, caption: site.name },
    ...(brand.logo && { image: `${site.url}${brand.logo.png}` }),
    ...(site.seller.legalName ? { legalName: site.seller.legalName } : {}),
    ...(site.seller.supportEmail ? { email: site.seller.supportEmail } : {}),
  };
  graph.push(organization);

  graph.push({
    "@type": "WebSite",
    "@id": id("website"),
    name: site.name,
    url: site.url,
    description: site.tagline,
    inLanguage: site.locale,
    publisher: { "@id": id("organization") },
  });

  graph.push({
    "@type": "VideoGame",
    "@id": id("game"),
    name: catalog.product.title,
    alternateName: [catalog.product.shortTitle, "GTA 6", "Grand Theft Auto 6"],
    url: site.url,
    gamePlatform: catalog.platforms.map((p) => p.name),
    ...(game.publisher.verified && { publisher: { "@type": "Organization", name: game.publisher.value } }),
    ...(game.releaseDate.verified && { datePublished: game.releaseDate.value }),
    ...(trailerEmbeds && { trailer: trailers.filter((t) => t.embeddable).map((t) => ({ "@id": id(`trailer-${t.youtubeId}`) })) }),
  });

  if (trailerEmbeds) {
    for (const t of trailers.filter((t) => t.embeddable)) {
      graph.push({
        "@type": "VideoObject",
        "@id": id(`trailer-${t.youtubeId}`),
        name: `${game.title}: ${t.title}`,
        description: `Official ${game.title} ${t.title.toLowerCase()} from Rockstar Games.`,
        thumbnailUrl: `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`,
        uploadDate: t.published,
        duration: `PT${Math.floor(t.durationSeconds / 60)}M${t.durationSeconds % 60}S`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${t.youtubeId}`,
        contentUrl: `https://www.youtube.com/watch?v=${t.youtubeId}`,
      });
    }
  }

  // Commercial markup only when the store can genuinely sell: checkout open and policies published.
  const sellable = checkoutOpen && Boolean(site.seller.legalName) && published.terms && published.refunds;
  if (sellable) {
    for (const e of catalog.editions) {
      const offers = catalog.platforms
        .filter((p) => p.available)
        .flatMap((p) => {
          const cents = catalog.prices[`${e.id}:${p.id}`];
          return typeof cents === "number" && cents > 0
            ? [{ "@type": "Offer", name: `${e.name}, ${p.name}`, price: (cents / 100).toFixed(2), priceCurrency: catalog.currency, availability: "https://schema.org/InStock", url: `${site.url}/checkout?edition=${e.id}&platform=${p.id}`, seller: { "@id": id("organization") } }]
            : [];
        });
      if (offers.length) graph.push({ "@type": "Product", name: `${catalog.product.title} ${e.name}`, brand: { "@type": "Brand", name: game.publisher.verified ? game.publisher.value : catalog.product.title }, isRelatedTo: { "@id": id("game") }, offers });
    }
  }

  // Exactly the answers shown on this build (verified, and relevant while checkout is closed or open).
  const verifiedFaq = publishedFaq(faq);
  if (verifiedFaq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": id("faq"),
      mainEntity: verifiedFaq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    });
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") }} />;
}

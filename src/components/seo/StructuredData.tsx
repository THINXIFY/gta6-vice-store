import { trailerEmbeds, trailers } from "@/config/media";
import { faq } from "@/config/policies";
import { editions, game, platforms } from "@/config/product";
import { site } from "@/config/site";
import type { Catalog } from "@/lib/catalog";
import { checkoutOpen } from "@/lib/checkout";

/**
 * JSON-LD that mirrors visible, verified content only. Each entity is gated on what is true
 * today, so markup can never get ahead of the business:
 *  - WebSite: always. Organization: only once the seller's legal name is confirmed.
 *  - VideoGame: verified game facts. VideoObject: the official trailers shown on the page.
 *  - FAQPage: verified answers only.
 *  - Product + Offer: only while live checkout is open (real stock, rights, policies), from
 *    the live catalogue prices. Never ratings or reviews.
 */
export function StructuredData({ catalog }: { catalog: Catalog }) {
  const id = (frag: string) => `${site.url}/#${frag}`;
  const graph: Record<string, unknown>[] = [];

  const organization = site.seller.legalName
    ? { "@type": "Organization", "@id": id("organization"), name: site.name, legalName: site.seller.legalName, url: site.url, logo: `${site.url}/icon.svg`, ...(site.seller.supportEmail ? { email: site.seller.supportEmail } : {}) }
    : null;
  if (organization) graph.push(organization);

  graph.push({
    "@type": "WebSite",
    "@id": id("website"),
    name: site.name,
    url: site.url,
    description: `${site.tagline} ${site.shortDisclaimer}`,
    inLanguage: site.locale,
    ...(organization && { publisher: { "@id": id("organization") } }),
  });

  graph.push({
    "@type": "VideoGame",
    "@id": id("game"),
    name: game.title,
    alternateName: [game.shortTitle, "GTA 6", "Grand Theft Auto 6"],
    url: site.url,
    gamePlatform: platforms.filter((p) => p.verified).map((p) => p.name),
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
  const sellable = checkoutOpen && Boolean(site.seller.legalName) && site.pages.terms.published && site.pages.refunds.published;
  if (sellable) {
    for (const e of editions) {
      const offers = platforms
        .filter((p) => p.verified && catalog.platforms[p.id] !== false)
        .flatMap((p) => {
          const cents = catalog.prices[`${e.id}:${p.id}`];
          return typeof cents === "number" && cents > 0
            ? [{ "@type": "Offer", name: `${e.name}, ${p.name}`, price: (cents / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${site.url}/checkout?edition=${e.id}&platform=${p.id}`, seller: { "@id": id("organization") } }]
            : [];
        });
      if (offers.length) graph.push({ "@type": "Product", name: `${game.title} ${e.name}`, brand: { "@type": "Brand", name: game.publisher.verified ? game.publisher.value : game.title }, isRelatedTo: { "@id": id("game") }, offers });
    }
  }

  const verifiedFaq = faq.filter((f) => f.status === "verified");
  if (verifiedFaq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": id("faq"),
      mainEntity: verifiedFaq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    });
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") }} />;
}

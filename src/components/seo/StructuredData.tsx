import { faq } from "@/config/policies";
import { game, platforms } from "@/config/product";
import { site } from "@/config/site";

/**
 * JSON-LD that mirrors visible, verified content only: the game's verified facts and the
 * verified FAQ answers. No offers, prices, availability, ratings or reviews until real.
 */
export function StructuredData() {
  const videoGame = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    alternateName: game.shortTitle,
    url: site.url,
    gamePlatform: platforms.filter((p) => p.verified).map((p) => p.name),
    ...(game.publisher.verified && { publisher: { "@type": "Organization", name: game.publisher.value } }),
    ...(game.releaseDate.verified && { datePublished: game.releaseDate.value }),
  };

  const verifiedFaq = faq.filter((f) => f.status === "verified");
  const faqPage =
    verifiedFaq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: verifiedFaq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const json = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={json(videoGame)} />
      {faqPage && <script type="application/ld+json" dangerouslySetInnerHTML={json(faqPage)} />}
    </>
  );
}

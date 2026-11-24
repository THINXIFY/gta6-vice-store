import { site, type PageId } from "@/config/site";
import { checkoutOpen } from "@/lib/checkout";
import { indexable } from "@/lib/seo";
import { getCatalog } from "@/server/catalog";
import { getContent } from "@/server/content";

/**
 * /llms.txt: a plain summary of the store for AI search and assistants (llmstxt.org format),
 * built from the live catalogue and published pages, so it never states anything the site does not.
 */
export async function GET() {
  if (!indexable) return new Response("Not found", { status: 404 });
  const [catalog, { published, pages, faq }] = await Promise.all([getCatalog(), getContent()]);
  const url = (path: string) => new URL(path, site.url).toString();
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: catalog.currency }).format(cents / 100);
  const editions = catalog.editions.flatMap((e) => {
    const prices = catalog.platforms
      .filter((p) => p.available)
      .flatMap((p) => {
        const c = catalog.prices[`${e.id}:${p.id}`];
        return c == null ? [] : [`${p.name} ${money(c)}`];
      });
    return prices.length ? [`- ${catalog.product.title} ${e.name}: ${e.shortSummary} (${prices.join(", ")})`] : [];
  });
  const answers = faq.filter((f) => f.status === "verified" && (!f.requires || checkoutOpen)).map((f) => `- ${f.question} ${f.answer}`);
  const links = (Object.keys(site.pages) as PageId[]).filter((id) => published[id]).map((id) => `- [${pages[id].heading}](${url(site.pages[id].href)}): ${pages[id].description}`);

  const body = [
    `# ${site.name}`,
    "",
    `> ${site.name} is an independent online store for ${catalog.product.title} (GTA 6) on ${catalog.platforms.map((p) => p.name).join(" and ")}. ${site.tagline}`,
    "",
    "## Editions and prices",
    `Prices in ${catalog.currency}.${checkoutOpen ? " Paid in cryptocurrency; every payment is checked by a person before the game is released." : " Checkout is not open yet."}`,
    ...editions,
    "",
    "## Common questions",
    ...answers,
    "",
    "## Pages",
    `- [Home: compare editions](${url("/")})`,
    ...links,
    `- [Media credits](${url("/credits")})`,
    "",
    "## Contact",
    `- Email: ${site.support.email}`,
  ].join("\n");

  return new Response(body + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

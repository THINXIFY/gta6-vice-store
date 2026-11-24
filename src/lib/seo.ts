/**
 * Search indexing is ON unless NEXT_PUBLIC_INDEXABLE is "false" (build time): pages are indexable,
 * robots.txt allows crawling and the sitemap lists every published page. Set it to "false" for a
 * staging or private copy.
 */
export const indexable = process.env.NEXT_PUBLIC_INDEXABLE !== "false";

import type { MetadataRoute } from "next";
import { site, type PageId } from "@/config/site";
import { getContent } from "@/server/content";
import { indexable } from "@/lib/seo";

/** When this build was made: the homepage and credits change with each release. */
const built = new Date();

/** Every published page (empty when indexing is off: NEXT_PUBLIC_INDEXABLE=false). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable) return [];
  const { published, pages } = await getContent();
  const url = (path: string) => new URL(path, site.url).toString();
  const info = (Object.keys(site.pages) as PageId[])
    .filter((id) => published[id])
    .map((id) => ({ url: url(site.pages[id].href), lastModified: pages[id].updated ? new Date(pages[id].updated!) : built, changeFrequency: "monthly" as const, priority: 0.6 }));
  return [
    { url: url("/"), lastModified: built, changeFrequency: "weekly", priority: 1 },
    ...info,
    { url: url("/credits"), lastModified: built, changeFrequency: "monthly", priority: 0.3 },
  ];
}

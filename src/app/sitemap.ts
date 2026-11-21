import type { MetadataRoute } from "next";
import { site, type PageId } from "@/config/site";
import { getPublished } from "@/server/content";

/** Only published, indexable pages. Empty until launch (NEXT_PUBLIC_INDEXABLE=true). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "true") return [];
  const published = await getPublished();
  const pages = (Object.keys(site.pages) as PageId[]).filter((id) => published[id]).map((id) => site.pages[id].href);
  return ["/", "/credits", ...pages].map((path) => ({ url: new URL(path, site.url).toString(), changeFrequency: path === "/" ? "weekly" : "monthly", priority: path === "/" ? 1 : 0.5 }));
}

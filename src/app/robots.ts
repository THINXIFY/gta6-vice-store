import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * Until launch (NEXT_PUBLIC_INDEXABLE !== "true") nothing is crawled. After launch, public
 * pages are crawlable and private or transactional routes are excluded.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/order-status", "/preview-media/"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

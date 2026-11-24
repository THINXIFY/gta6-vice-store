import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/** Link-preview fetchers (not search indexes): they read a page's share tags to draw a card. */
const previewBots = ["Twitterbot", "facebookexternalhit", "LinkedInBot", "Discordbot", "WhatsApp", "Slackbot-LinkExpanding", "TelegramBot"];

/**
 * Until launch (NEXT_PUBLIC_INDEXABLE !== "true") nothing is crawled by search engines; link-preview
 * bots may read the public pages so shared links show the branded card (pages also carry noindex).
 * After launch, public pages are crawlable and private or transactional routes are excluded.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "true")
    return {
      rules: [
        { userAgent: previewBots, allow: "/", disallow: ["/admin", "/api/", "/checkout", "/order-status"] },
        { userAgent: "*", disallow: "/" },
      ],
    };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/order-status", "/preview-media/"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

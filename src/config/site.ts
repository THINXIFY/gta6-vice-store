import { brand } from "@/brand/brand";

/**
 * Site settings. Identity (name, wordmark, tagline, title, description, locale, seller,
 * support) comes from this client's src/brand/brand.ts; structure (nav, pages) lives here.
 */
export const site = {
  name: brand.name,
  wordmark: brand.wordmark,
  tagline: brand.tagline,
  /**
   * Canonical origin: set NEXT_PUBLIC_SITE_URL per environment (canonical URLs, Open Graph,
   * sitemap, structured data and email links all derive from it). Choose a domain that does
   * not use Rockstar or Take-Two trademarks, so it never implies affiliation.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  title: brand.title,
  locale: brand.locale,
  seller: brand.seller,
  /** The menu comes from the enabled home page blocks (Admin → Homepage; src/server/home.ts). */
  purchaseHref: "#editions",
  description: brand.description,
  support: brand.support,
  /**
   * Information pages. Content lives in server-only src/config/legal.ts. An unpublished page
   * renders only in content preview (marked draft, noindex) and 404s on the live site, and its
   * links are hidden. Publish only after the seller details and policy terms are confirmed.
   */
  pages: {
    about: { href: "/about", label: "About us", published: false },
    contact: { href: "/contact", label: "Contact & support", published: false },
    terms: { href: "/terms", label: "Terms & Conditions", published: false },
    privacy: { href: "/privacy", label: "Privacy Policy", published: false },
    refunds: { href: "/refund-policy", label: "Refund Policy", published: false },
    cookies: { href: "/cookies", label: "Cookie Policy", published: false },
  },
} as const satisfies { pages: Record<string, { href: string; label: string; published: boolean }> } & Record<string, unknown>;

export type PageId = keyof typeof site.pages;

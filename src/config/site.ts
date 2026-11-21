/**
 * Brand, domain and seller details: the single source for names, URLs and SEO copy.
 * Seller fields stay empty until the business details are confirmed.
 */
export const site = {
  /** Brand name (pending trademark clearance). Rendered as a wordmark by <Wordmark>. */
  name: "VICE STORE",
  /** The two parts of the wordmark: first in white, second in the sunset gradient. */
  wordmark: ["VICE", "STORE"],
  tagline: "Unlock your next adventure.",
  /**
   * Canonical origin: set NEXT_PUBLIC_SITE_URL per environment (canonical URLs, Open Graph,
   * sitemap, structured data and email links all derive from it). Choose a domain that does
   * not use Rockstar or Take-Two trademarks, so it never implies affiliation.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  /** Default page title and description (SEO). */
  title: "GTA VI Standard & Ultimate Editions",
  locale: "en-US",
  seller: {
    legalName: "", // e.g. "Example Trading Ltd"
    supportEmail: "",
    country: "",
  },
  /** In-page navigation. Every `href` must match a section id on the page. */
  nav: [
    { label: "Home", href: "#overview" },
    { label: "Editions", href: "#editions" },
    { label: "Explore", href: "#explore" },
    { label: "Trailers", href: "#trailers" },
    { label: "FAQ", href: "#faq" },
  ],
  purchaseHref: "#editions",
  /** Footer description. Keep factual. */
  description: "An independent store for Grand Theft Auto VI on PlayStation 5 and Xbox Series X|S. Compare editions, choose your platform and see Leonida before you buy.",
  /** Customer support destinations. Empty = not shown on the live site (never a dead link). */
  support: { url: "", email: "" },
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
  shortDisclaimer: "Independent retailer. Not affiliated with Rockstar Games.",
  disclaimer:
    "Independent retailer. Not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and related marks are trademarks of Take-Two Interactive Software, Inc.",
} as const satisfies { pages: Record<string, { href: string; label: string; published: boolean }> } & Record<string, unknown>;

export type PageId = keyof typeof site.pages;

/** Seller and brand details. All placeholders until the business details are confirmed. */
export const site = {
  /** Working codename; replace once the brand is chosen and cleared. */
  name: "VICE",
  tagline: "Cinematic commerce",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en-US",
  seller: {
    legalName: "", // e.g. "Example Trading Ltd"
    supportEmail: "",
    country: "",
  },
  /** In-page navigation. Every `href` must match a section id on the page. */
  nav: [
    { label: "Overview", href: "#overview" },
    { label: "Editions", href: "#editions" },
    { label: "Explore", href: "#explore" },
    { label: "Trailers", href: "#trailers" },
  ],
  purchaseHref: "#editions",
  /** Footer description. Keep factual. */
  description: "An independent store for Grand Theft Auto VI on PlayStation 5 and Xbox Series X|S. Compare editions, choose your platform and see Leonida before you buy.",
  /** Customer support destinations. Empty = not shown on the live site (never a dead link). */
  support: { url: "", email: "" },
  /** Legal pages. Empty = not shown on the live site; listed as pending in content preview. */
  legal: [
    { id: "privacy", label: "Privacy Policy", href: "" },
    { id: "terms", label: "Terms & Conditions", href: "" },
    { id: "refunds", label: "Refund Policy", href: "" },
  ],
  shortDisclaimer: "Independent retailer. Not affiliated with Rockstar Games.",
  disclaimer:
    "Independent retailer. Not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and related marks are trademarks of Take-Two Interactive Software, Inc.",
} as const satisfies { legal: readonly { id: string; label: string; href: string }[] } & Record<string, unknown>;

/**
 * THIS CLIENT'S BRAND. One of the few files that differ between client copies
 * (see docs/white-label.md). Everything else — the theme, favicon, home-screen icon, share
 * image, emails and page titles — is generated from it.
 *
 * Colours: pick the nine roles below. Tints (status backgrounds, admin surfaces, the
 * gradient midpoint) are mixed automatically in src/brand/theme.ts.
 * Fonts: the web fonts are loaded in src/brand/fonts.ts; the names here are used where web
 * fonts cannot load (emails) and must match the files in src/brand/fonts/ (share image, icons).
 */
export const brand = {
  /** Store name, as written in titles and emails. */
  name: "VICE STORE",
  /** The wordmark in two parts: the first in the text colour, the second in the primary → secondary gradient. */
  wordmark: ["VICE", "STORE"] as const,
  /**
   * The supplied logo (sources in src/brand/assets/, files built by `npm run brand:assets`).
   * Set to null to fall back to the typeset wordmark above. Icons are built from assets/mark.png.
   */
  logo: { png: "/brand/logo.png", webp: "/brand/logo.webp", width: 1200, height: 339 } as { png: string; webp: string; width: number; height: number } | null,
  /** One or two characters for a client without a logo (alt text fallback). */
  monogram: "V",
  tagline: "Unlock your next adventure.",
  /** Default page title (SEO); the store name is appended. */
  title: "GTA VI Standard & Ultimate Editions",
  /** Footer and default meta description. Keep factual. */
  description: "A store for Grand Theft Auto VI on PlayStation 5 and Xbox Series X|S. Compare editions, choose your platform and see Leonida before you buy.",
  locale: "en-US",
  /** Google Search Console HTML-tag verification token (GOOGLE_SITE_VERIFICATION overrides it). */
  googleSiteVerification: "w3T6pW8-HnXppFB2Rkg6eMi3nq1w9U2JuQtSiXaPqOs",

  /** The business behind the store. Empty fields stay hidden (and gate Organization structured data). */
  seller: {
    legalName: "", // e.g. "Example Trading Ltd"
    supportEmail: "gta@vicestoregaming.com",
    country: "",
  },
  /** Customer support destinations. Empty = not shown on the live site (never a dead link). */
  support: { url: "", email: "gta@vicestoregaming.com" },

  colors: {
    /** Page background (darkest). */
    base: "#08080d",
    /** Raised surfaces and cards. */
    surface: "#171020",
    /** Main accent: buttons, highlights, the first gradient stop. */
    primary: "#ff579a",
    /** Second accent: the gradient's end, prices, step numbers. */
    secondary: "#ff9b62",
    /** Third accent for variety (badges, focus rings). */
    accent: "#b28cff",
    /** Text on the background. */
    text: "#fff4eb",
    /** Confirmations ("payment submitted", valid fields). */
    success: "#7be3ae",
    /** Test and caution markers. */
    warning: "#ffd400",
    /** Error text (light, readable on the dark background). */
    danger: "#ff9fc4",
  },

  fonts: {
    /** Display face for headings and the wordmark. */
    display: "Big Shoulders Display",
    /** Body face. */
    sans: "Hanken Grotesk",
  },
} as const;

export type Brand = typeof brand;

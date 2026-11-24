import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { brand } from "@/brand/brand";
import { displayFont, sansFont } from "@/brand/fonts";
import { themeCss } from "@/brand/theme";
import { CatalogProvider } from "@/components/CatalogProvider";
import { ContentProvider } from "@/components/ContentProvider";
import { Header } from "@/components/layout/Header";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { commerce } from "@/config/product";
import { site } from "@/config/site";
import { getCatalog } from "@/server/catalog";
import { getNav } from "@/server/home";
import { getContent } from "@/server/content";
import { indexable } from "@/lib/seo";
import "./globals.css";


const MOTION_BOOT = `if(matchMedia("(prefers-reduced-motion: no-preference)").matches)document.documentElement.classList.add("motion-ok")`;


// Search snippet: titles under 60 characters, descriptions under 160. "GTA 6" is how most people
// search for the game; purchase wording only once checkout is genuinely open.
const homeTitle = commerce.checkoutEnabled ? `Buy GTA 6 for PS5 & Xbox Series X|S | ${site.name}` : `GTA 6 PS5 & Xbox Series X|S: Editions & Prices | ${site.name}`;
const description = commerce.checkoutEnabled
  ? `Buy GTA 6 (Grand Theft Auto VI) Standard or Ultimate Edition for PS5 and Xbox Series X|S as a digital code. Compare editions, pay in crypto.`
  : `Compare GTA 6 (Grand Theft Auto VI) Standard and Ultimate Edition for PS5 and Xbox Series X|S: prices, what each includes and digital codes.`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  title: { default: homeTitle, template: `%s | ${site.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale.replace("-", "_"),
    url: "/",
    title: homeTitle,
    description,
  },
  twitter: { card: "summary_large_image", title: homeTitle, description },
  appleWebApp: { title: site.name, statusBarStyle: "black-translucent" },
  robots: indexable
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: false },
  // Search Console / Bing Webmaster ownership tokens (meta-tag method), set per environment.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || brand.googleSiteVerification,
    ...(process.env.BING_SITE_VERIFICATION && { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }),
  },
};

export const viewport: Viewport = {
  themeColor: brand.colors.base,
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Per-request CSP nonce from src/proxy.ts (also makes every page dynamically rendered).
  const [nonce, catalog, nav, content] = await Promise.all([headers().then((h) => h.get("x-nonce") ?? undefined), getCatalog(), getNav(), getContent()]);
  return (
    // suppressHydrationWarning: the inline script below adds a class before hydration.
    <html lang={brand.locale.split("-")[0]} className={`${displayFont.variable} ${sansFont.variable}`} suppressHydrationWarning>
      <head>
        {/* This client's theme colours (src/brand), generated from brand.ts. */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        {/* Runs before first paint so motion-only initial states never flash. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-warm focus:px-5 focus:py-3 focus:text-obsidian"
        >
          Skip to content
        </a>
        <CatalogProvider catalog={catalog}>
          <ContentProvider copy={content.copy} published={content.published}>
            <SmoothScroll />
            <Header nav={nav} />
            {children}
          </ContentProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}

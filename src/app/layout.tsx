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
import "./globals.css";


const MOTION_BOOT = `if(matchMedia("(prefers-reduced-motion: no-preference)").matches)document.documentElement.classList.add("motion-ok")`;

/** Flip to "true" at launch. Keeps placeholder builds out of search indexes. */
const indexable = process.env.NEXT_PUBLIC_INDEXABLE === "true";

// Under 160 characters. Purchase wording only once checkout is genuinely open.
const description = commerce.checkoutEnabled
  ? `Buy GTA VI Standard or Ultimate Edition for PS5 and Xbox Series X|S. Compare what each edition includes and pay in crypto.`
  : `Compare GTA VI Standard and Ultimate Edition for PS5 and Xbox Series X|S: prices, what each includes and which to choose.`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  title: { default: `${site.title} | ${site.name}`, template: `%s | ${site.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale.replace("-", "_"),
    url: "/",
    title: `${site.title} | ${site.name}`,
    description,
  },
  twitter: { card: "summary_large_image", title: `${site.title} | ${site.name}`, description },
  appleWebApp: { title: site.name, statusBarStyle: "black-translucent" },
  robots: { index: indexable, follow: indexable },
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

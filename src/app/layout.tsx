import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Hanken_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { Header } from "@/components/layout/Header";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { commerce } from "@/config/product";
import { site } from "@/config/site";
import { shareImage } from "@/config/media";
import { isUsable } from "@/lib/media";
import "./globals.css";

const display = Big_Shoulders({ subsets: ["latin"], axes: ["opsz"], variable: "--font-big-shoulders", display: "swap", fallback: ["Arial Narrow", "sans-serif"], adjustFontFallback: false });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });

const MOTION_BOOT = `if(matchMedia("(prefers-reduced-motion: no-preference)").matches)document.documentElement.classList.add("motion-ok")`;

/** Flip to "true" at launch. Keeps placeholder builds out of search indexes. */
const indexable = process.env.NEXT_PUBLIC_INDEXABLE === "true";

// Under 160 characters. Purchase wording only once checkout is genuinely open.
const description = commerce.checkoutEnabled
  ? `Buy GTA VI Standard or Ultimate Edition for PS5 and Xbox Series X|S. Compare what each edition includes and pay in crypto. Independent retailer.`
  : `Compare GTA VI Standard and Ultimate Edition for PS5 and Xbox Series X|S: prices, what each includes and which to choose. Independent retailer.`;

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
    // A usable (licensed, or local-preview) key-art image; otherwise the generated brand card (opengraph-image.tsx).
    ...(isUsable(shareImage) && { images: [{ url: shareImage.src, width: shareImage.width, height: shareImage.height, alt: shareImage.alt }] }),
  },
  twitter: { card: "summary_large_image", title: `${site.title} | ${site.name}`, description, ...(isUsable(shareImage) && { images: [shareImage.src] }) },
  robots: { index: indexable, follow: indexable },
  // Search Console / Bing Webmaster ownership tokens (meta-tag method), set per environment.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
    ...(process.env.BING_SITE_VERIFICATION && { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }),
  },
};

export const viewport: Viewport = {
  themeColor: "#08080d",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Per-request CSP nonce from src/proxy.ts (also makes every page dynamically rendered).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // suppressHydrationWarning: the inline script below adds a class before hydration.
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
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
        <SmoothScroll />
        <Header />
        {children}
      </body>
    </html>
  );
}

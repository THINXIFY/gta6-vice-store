import type { MetadataRoute } from "next";
import { brand } from "@/brand/brand";
import { site } from "@/config/site";

/** Web app manifest: name, colours and home-screen icons (built by `npm run brand:assets`). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brand.colors.base,
    theme_color: brand.colors.base,
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

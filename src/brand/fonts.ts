import { readFile } from "node:fs/promises";
import path from "node:path";
import { Big_Shoulders, Hanken_Grotesk } from "next/font/google";

/**
 * THIS CLIENT'S WEB FONTS (per-client file, see docs/white-label.md). next/font needs static
 * calls, so a client copy swaps the two imports and calls below; keep the `variable` names.
 * Also replace src/brand/fonts/display.woff and sans.woff (used by the share image and icons,
 * where web fonts cannot load) and the names in brand.fonts.
 */
export const displayFont = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-brand-display",
  display: "swap",
  fallback: ["Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

export const sansFont = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-brand-sans", display: "swap" });

/** The static font files for generated images (share image, icons). Server-only. */
export async function imageFonts() {
  const file = (name: string) => readFile(path.join(process.cwd(), "src/brand/fonts", name));
  const [display, sans] = await Promise.all([file("display.woff"), file("sans.woff")]);
  return { display, sans };
}

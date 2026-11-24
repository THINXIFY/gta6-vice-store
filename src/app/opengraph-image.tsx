import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "@/brand/brand";
import { imageFonts } from "@/brand/fonts";
import { palette } from "@/brand/theme";
import { site } from "@/config/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** `#rrggbb` + alpha (0–1) as `#rrggbbaa`, for gradients in the generated image. */
const a = (hex: string, alpha: number) => hex + Math.round(alpha * 255).toString(16).padStart(2, "0");

/** Horizon lines, closer together toward the horizon (a flat take on a neon grid; original art). */
const horizon = [0, 5, 11, 19, 30, 44, 62, 84, 110];

/**
 * Social sharing card (Open Graph + X): this client's logo over a sunset glow and a neon horizon,
 * with the tagline and domain. Brand files only, never game artwork.
 */
export default async function OpengraphImage() {
  const [first, second] = site.wordmark;
  const { display, sans } = await imageFonts();
  const logo = brand.logo ? `data:image/png;base64,${(await readFile(join(process.cwd(), "public", brand.logo.png))).toString("base64")}` : null;
  const host = new URL(site.url).host.replace(/^www\./, "");
  const logoWidth = 860;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: palette.warm,
          fontFamily: "Sans",
          background: `radial-gradient(ellipse 60% 70% at 50% 62%, ${a(palette.sunset, 0.34)}, ${a(palette.vice, 0.16)} 45%, transparent 75%), radial-gradient(ellipse 50% 60% at 0% 0%, ${a(palette.lavender, 0.22)}, transparent 70%), radial-gradient(ellipse 45% 55% at 100% 0%, ${a(palette.vice, 0.16)}, transparent 70%), ${palette.obsidian}`,
        }}
      >
        {/* Neon horizon. */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 118, display: "flex" }}>
          {horizon.map((y, i) => (
            <div
              key={y}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: y,
                height: i === 0 ? 3 : 2,
                background: `linear-gradient(90deg, transparent, ${a(palette.vice, 0.55 - i * 0.05)} 25%, ${a(palette.sunset, 0.6 - i * 0.05)} 50%, ${a(palette.vice, 0.55 - i * 0.05)} 75%, transparent)`,
              }}
            />
          ))}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent, ${a(palette.obsidian, 0.85)})` }} />
        </div>

        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- rendered into a PNG; the card's alt text is `alt` above
          <img src={logo} width={logoWidth} height={Math.round((logoWidth * brand.logo!.height) / brand.logo!.width)} style={{ marginTop: -40 }} />
        ) : (
          <div style={{ display: "flex", fontFamily: "Display", fontSize: 210, fontWeight: 800, letterSpacing: 6, lineHeight: 0.9 }}>
            <span>{first}</span>
            <span style={{ marginLeft: 48, backgroundImage: `linear-gradient(100deg, ${palette.vice}, ${palette.sunset})`, backgroundClip: "text", color: "transparent" }}>{second}</span>
          </div>
        )}
        <div style={{ display: "flex", marginTop: 34, fontSize: 46, fontWeight: 500, color: palette.warm }}>{site.tagline}</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: a(palette.warm, 0.62) }}>{site.title}</div>

        <div style={{ position: "absolute", bottom: 34, display: "flex", fontSize: 24, letterSpacing: 2, color: a(palette.warm, 0.78) }}>{host}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, weight: 800, style: "normal" },
        { name: "Sans", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}

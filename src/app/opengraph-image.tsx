import { ImageResponse } from "next/og";
import { imageFonts } from "@/brand/fonts";
import { palette } from "@/brand/theme";
import { site } from "@/config/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** `#rrggbb` + alpha (0–1) as `#rrggbbaa`, for gradients in the generated image. */
const a = (hex: string, alpha: number) => hex + Math.round(alpha * 255).toString(16).padStart(2, "0");

/** Social sharing card: this client's wordmark, title and tagline in its brand colours (src/brand). */
export default async function OpengraphImage() {
  const [first, second] = site.wordmark;
  const { display, sans } = await imageFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: palette.warm,
          fontFamily: "Sans",
          background: `radial-gradient(ellipse at 85% 110%, ${a(palette.sunset, 0.45)}, ${a(palette.vice, 0.18)} 40%, transparent 70%), radial-gradient(ellipse at 0% 0%, ${a(palette.lavender, 0.25)}, transparent 55%), ${palette.obsidian}`,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: a(palette.warm, 0.6), letterSpacing: 1 }}>{site.title}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Display", fontSize: 210, fontWeight: 800, letterSpacing: 6, lineHeight: 0.9 }}>
            <span>{first}</span>
            <span style={{ marginLeft: 48, backgroundImage: `linear-gradient(100deg, ${palette.vice}, ${palette.sunset})`, backgroundClip: "text", color: "transparent" }}>{second}</span>
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 44, color: a(palette.warm, 0.85) }}>{site.tagline}</div>
        </div>
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

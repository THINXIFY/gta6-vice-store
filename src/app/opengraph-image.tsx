import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social sharing card: original brand artwork only (no game key art until licensed), with
 * the independent-retailer notice so a shared link never implies affiliation.
 */
export default async function OpengraphImage() {
  const [first, second] = site.wordmark;
  // Brand fonts (SIL Open Font License, from Google Fonts), Latin subset.
  const font = (file: string) => readFile(path.join(process.cwd(), "src/app/_fonts", file));
  const [display, sans] = await Promise.all([font("BigShoulders-ExtraBold.woff"), font("HankenGrotesk-Medium.woff")]);
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
          color: "#fff4eb",
          fontFamily: "Hanken Grotesk",
          background: "radial-gradient(ellipse at 85% 110%, rgba(255,155,98,0.45), rgba(255,87,154,0.18) 40%, transparent 70%), radial-gradient(ellipse at 0% 0%, rgba(178,140,255,0.25), transparent 55%), #08080d",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,244,235,0.6)", letterSpacing: 1 }}>Grand Theft Auto VI for PS5 and Xbox Series X|S</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: 210, fontWeight: 800, letterSpacing: 6, lineHeight: 0.9 }}>
            <span>{first}</span>
            <span style={{ marginLeft: 48, backgroundImage: "linear-gradient(100deg, #ff579a, #ff9b62)", backgroundClip: "text", color: "transparent" }}>{second}</span>
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 44, color: "rgba(255,244,235,0.85)" }}>{site.tagline}</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "rgba(255,244,235,0.5)" }}>{site.shortDisclaimer}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Big Shoulders", data: display, weight: 800, style: "normal" },
        { name: "Hanken Grotesk", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}

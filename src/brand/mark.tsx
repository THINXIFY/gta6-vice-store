import { ImageResponse } from "next/og";
import { brand } from "./brand";
import { imageFonts } from "./fonts";
import { palette } from "./theme";

/**
 * The brand mark as a PNG (favicon, home-screen icon): the monogram in the display face over a
 * primary → secondary bar, on the background colour. Generated from src/brand/brand.ts.
 */
export async function brandMark(px: number, { rounded = false }: { rounded?: boolean } = {}) {
  const { display } = await imageFonts();
  const letters = brand.monogram.length;
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
          borderRadius: rounded ? px * 0.22 : 0,
          background: `radial-gradient(circle at 50% 100%, ${palette.vice}59, ${palette.admin} 70%)`,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Display", fontSize: px * (letters > 1 ? 0.5 : 0.72), lineHeight: 1, color: palette.warm, marginTop: -px * 0.04 }}>{brand.monogram}</div>
        <div style={{ display: "flex", width: px * 0.42, height: Math.max(2, px * 0.07), borderRadius: px, marginTop: px * 0.04, backgroundImage: `linear-gradient(90deg, ${palette.vice}, ${palette.sunset})` }} />
      </div>
    ),
    { width: px, height: px, fonts: [{ name: "Display", data: display, weight: 800, style: "normal" }] },
  );
}

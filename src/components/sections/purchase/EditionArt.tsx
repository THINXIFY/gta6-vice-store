"use client";

import Image from "next/image";
import { useId } from "react";
import { editionArt } from "@/config/media";
import { useCatalog } from "@/components/CatalogProvider";
import { isUsable } from "@/lib/media";
import type { EditionId, PlatformId } from "@/config/types";
import { glitter, HORIZON, skyline, skylinePath, SUN, VIEWBOX } from "../hero/sceneGeometry";
import { cn } from "@/lib/utils";

/**
 * Edition artwork. Uses licensed art from `editionArt` when present; otherwise an
 * original drawn key frame with a distinct palette per edition, by position in the catalogue:
 * the first edition gets blue hour (lavender), the next golden hour (sunset), and so on.
 */

const PALETTES = [
  {
    sky: ["#06070d", "#0c0d1f", "#1b1840", "#36296a", "#6f53a8", "#b99bf2", "#ecdcff"],
    halo: "#d7c2ff",
    sun: ["#ffffff", "#efe4ff", "#c9b2ff"],
    numeral: ["#fff4eb", "#e9dcff", "#c5a9ff", "#8f6cf0"],
    skyline: "#2b2152",
    water: ["#31265c", "#1b1534", "#0e0c19", "#08080d"],
    glint: "#efe2ff",
  },
  {
    sky: ["#07070c", "#100c1b", "#24122f", "#56204a", "#a33a62", "#e2666a", "#ffa679"],
    halo: "#ffc89c",
    sun: ["#fff6ea", "#ffe0bd", "#ffbf8f"],
    numeral: ["#fff4eb", "#ffd2b0", "#ff9b7e", "#ff579a"],
    skyline: "#4a2146",
    water: ["#4b2042", "#2a1330", "#130c1a", "#08080d"],
    glint: "#ffd8b0",
  },
] as const;

const SKY_STOPS = [0, 0.3, 0.55, 0.74, 0.87, 0.95, 1];
const NUMERAL_STOPS = [0, 0.42, 0.72, 1];
const WATER_STOPS = [0, 0.18, 0.55, 1];
const FAR = skyline(11, { min: 8, max: 46, tall: [560, 960, 110] });
const GLITTER = glitter(3);

const usableArt = editionArt.filter((a) => isUsable(a.image));

export function findEditionArt(edition: EditionId, platform: PlatformId) {
  return (
    usableArt.find((a) => a.edition === edition && a.platform === platform) ??
    usableArt.find((a) => a.edition === edition && !a.platform)
  );
}

/** True when every edition has usable supplied art for this platform (drawn art otherwise). */
export function hasEditionArt(editionIds: EditionId[], platform: PlatformId) {
  return editionIds.every((id) => findEditionArt(id, platform));
}

export function EditionArt({ edition, platform, className, sizes = "50vw" }: { edition: EditionId; platform: PlatformId; className?: string; sizes?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { editions } = useCatalog();
  const licensed = findEditionArt(edition, platform);

  if (licensed) {
    return <Image src={licensed.image.src} alt="" fill sizes={sizes} className={cn("object-cover", className)} />;
  }

  const p = PALETTES[Math.max(0, editions.findIndex((e) => e.id === edition)) % PALETTES.length]!;
  const id = (name: string) => `${uid}-${name}`;

  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMaxYMax slice" className={cn("size-full", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
          {p.sky.map((c, i) => <stop key={i} offset={SKY_STOPS[i]} stopColor={c} />)}
        </linearGradient>
        <radialGradient id={id("halo")} cx={SUN.x} cy={HORIZON} r="640" gradientUnits="userSpaceOnUse" gradientTransform={`matrix(1 0 0 0.45 0 ${HORIZON * 0.55})`}>
          <stop offset="0" stopColor={p.halo} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.halo} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("sun")} cx="0.5" cy="0.5" r="0.5">
          {p.sun.map((c, i) => <stop key={i} offset={[0, 0.7, 1][i]} stopColor={c} />)}
        </radialGradient>
        <linearGradient id={id("numeral")} x1="0" y1="200" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
          {p.numeral.map((c, i) => <stop key={i} offset={NUMERAL_STOPS[i]} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={id("water")} x1="0" y1={HORIZON} x2="0" y2="1000" gradientUnits="userSpaceOnUse">
          {p.water.map((c, i) => <stop key={i} offset={WATER_STOPS[i]} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={id("haze")} x1="0" y1={HORIZON - 200} x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.halo} stopOpacity="0" />
          <stop offset="1" stopColor={p.halo} stopOpacity="0.38" />
        </linearGradient>
        {/* Cloud streaks fade at both ends. A gradient, not an SVG filter: filters (noise +
            displacement + blur) re-rasterise on every repaint and made selection changes slow (INP). */}
        <linearGradient id={id("wisp")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.halo} stopOpacity="0" />
          <stop offset="0.45" stopColor={p.halo} stopOpacity="1" />
          <stop offset="1" stopColor={p.halo} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill={`url(#${id("sky")})`} />
      <g fill={`url(#${id("wisp")})`}>
        <ellipse cx="1300" cy="330" rx="520" ry="10" opacity="0.1" />
        <ellipse cx="900" cy="480" rx="640" ry="12" opacity="0.14" />
        <ellipse cx="1420" cy="585" rx="380" ry="8" opacity="0.2" />
      </g>
      <rect width="1600" height={HORIZON + 10} fill={`url(#${id("halo")})`} />
      <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={`url(#${id("sun")})`} />
      <text
        x="1500"
        y={HORIZON + 26}
        textAnchor="end"
        fontSize="480"
        fontWeight="800"
        letterSpacing="-6"
        fill={`url(#${id("numeral")})`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        VI
      </text>
      <rect y={HORIZON - 200} width="1600" height="206" fill={`url(#${id("haze")})`} />
      <path d={skylinePath(FAR)} fill={p.skyline} />
      <rect y={HORIZON} width="1600" height={1000 - HORIZON} fill={`url(#${id("water")})`} />
      <g fill={p.glint}>
        {GLITTER.map((g, i) => (
          <rect key={i} x={g.x} y={g.y} width={g.w} height={g.h} rx={g.h / 2} opacity={g.o} />
        ))}
      </g>
    </svg>
  );
}

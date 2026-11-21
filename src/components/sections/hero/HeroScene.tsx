import type { ReactNode } from "react";
import { frond, glitter, HORIZON, skyline, skylinePath, SUN, trunk, VIEWBOX, windows } from "./sceneGeometry";

/**
 * Original, code-drawn hero scene (no third-party art): dusk over a bay city.
 * Layers share one viewBox with `xMaxYMax slice`, so they stay registered at every
 * aspect ratio while each moves independently for depth. Replaced by licensed
 * art via `heroArt` in config/media.ts.
 */

function Layer({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <div data-depth={depth} className="absolute inset-0 will-change-transform">
      <svg viewBox={VIEWBOX} preserveAspectRatio="xMaxYMax slice" className="size-full" aria-hidden focusable="false">
        {children}
      </svg>
    </div>
  );
}

const FAR = skyline(11, { min: 8, max: 46, tall: [560, 960, 110] });
const MID = skyline(23, { min: 3, max: 22 });
const FAR_LIGHTS = windows(FAR, 5, 1);
const GLITTER = glitter(3);
const FRONDS = [frond(230, 1), frond(205, 2), frond(250, 3)];

/** Crown layout: [variant, rotation°, scale, mirrored]. Drooping lower fronds sell the realism. */
const CROWN: [number, number, number, boolean][] = [
  [1, -52, 0.95, false], [2, -22, 1, false], [0, 8, 0.95, false], [1, 40, 0.72, false],
  [2, -48, 0.95, true], [0, -18, 1, true], [1, 12, 0.92, true], [0, 44, 0.68, true],
  [2, -84, 0.7, false],
];

function Palm({ x, y, base, scale }: { x: number; y: number; base: number; scale: number }) {
  return (
    <g>
      <path d={trunk(x, y, base, scale)} />
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        {CROWN.map(([v, rot, s, mirror], i) => (
          <use key={i} href={`#frond-${v}`} transform={`${mirror ? "scale(-1 1) " : ""}rotate(${rot}) scale(${s})`} />
        ))}
        <ellipse rx="9" ry="7" />
      </g>
    </g>
  );
}

const VI_TEXT = { x: 1462, y: HORIZON + 34, fontSize: 650, fontWeight: 800, letterSpacing: -8 } as const;
const fontStyle = { fontFamily: "var(--font-display)" };

export function HeroScene() {
  return (
    <div data-hero-scene className="absolute inset-0 origin-[72%_68%]">
      {/* 1 · Sky, clouds, sun, distant city */}
      <Layer depth={0.34}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#07070c" />
            <stop offset="0.3" stopColor="#100c1b" />
            <stop offset="0.55" stopColor="#24122f" />
            <stop offset="0.74" stopColor="#56204a" />
            <stop offset="0.87" stopColor="#a33a62" />
            <stop offset="0.95" stopColor="#e2666a" />
            <stop offset="1" stopColor="#ffa679" />
          </linearGradient>
          <radialGradient id="halo" cx={SUN.x} cy={HORIZON} r="620" gradientUnits="userSpaceOnUse" gradientTransform={`matrix(1 0 0 0.42 0 ${HORIZON * 0.58})`}>
            <stop offset="0" stopColor="#ffc89c" stopOpacity="0.55" />
            <stop offset="0.35" stopColor="#ff8a73" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ff579a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff6ea" />
            <stop offset="0.7" stopColor="#ffe0bd" />
            <stop offset="1" stopColor="#ffbf8f" />
          </radialGradient>
          <linearGradient id="cloud-hi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a1a44" stopOpacity="0" />
            <stop offset="1" stopColor="#c8517a" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="cloud-lo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a2a55" stopOpacity="0.2" />
            <stop offset="1" stopColor="#ff9a7c" stopOpacity="0.7" />
          </linearGradient>
          <filter id="wisp" x="-20%" y="-300%" width="140%" height="700%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.05" numOctaves="4" seed="8" />
            <feDisplacementMap in="SourceGraphic" scale="70" />
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        <rect width="1600" height="1000" fill="url(#sky)" />
        <g filter="url(#wisp)">
          <ellipse cx="560" cy="250" rx="520" ry="9" fill="url(#cloud-hi)" opacity="0.6" />
          <ellipse cx="1180" cy="330" rx="620" ry="12" fill="url(#cloud-hi)" opacity="0.8" />
          <ellipse cx="760" cy="455" rx="700" ry="15" fill="url(#cloud-lo)" opacity="0.7" />
          <ellipse cx="1340" cy="545" rx="420" ry="10" fill="url(#cloud-lo)" />
          <ellipse cx="420" cy="590" rx="380" ry="7" fill="url(#cloud-lo)" opacity="0.6" />
        </g>
        <rect width="1600" height={HORIZON + 10} fill="url(#halo)" />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="url(#sun)" filter="url(#soft)" />
        <path d={skylinePath(FAR)} fill="#4a2146" opacity="0.92" />
        <g fill="#ffc48a" opacity="0.55">
          {FAR_LIGHTS.map((w, i) => (
            <rect key={i} x={w.x} y={w.y} width="1.6" height="1.6" />
          ))}
        </g>
      </Layer>

      {/* 2 · The numeral — rises from behind the horizon on load */}
      <Layer depth={0.22}>
        <defs>
          <linearGradient id="numeral" x1="0" y1="170" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff4eb" />
            <stop offset="0.42" stopColor="#ffd2b0" />
            <stop offset="0.72" stopColor="#ff9b7e" />
            <stop offset="1" stopColor="#ff579a" />
          </linearGradient>
        </defs>
        <g data-hero-layer="numeral">
          <text {...VI_TEXT} textAnchor="end" fill="url(#numeral)" style={fontStyle}>VI</text>
        </g>
      </Layer>

      {/* 3 · Atmospheric haze, near shoreline, water, reflections */}
      <Layer depth={0.14}>
        <defs>
          <linearGradient id="haze" x1="0" y1={HORIZON - 170} x2="0" y2={HORIZON + 6} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff8f7a" stopOpacity="0" />
            <stop offset="0.75" stopColor="#ff8f7a" stopOpacity="0.2" />
            <stop offset="1" stopColor="#ffb48c" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1={HORIZON} x2="0" y2="1000" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4b2042" />
            <stop offset="0.18" stopColor="#2a1330" />
            <stop offset="0.55" stopColor="#130c1a" />
            <stop offset="1" stopColor="#08080d" />
          </linearGradient>
          <linearGradient id="fade-down" x1="0" y1={HORIZON} x2="0" y2={HORIZON + 300} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="reflection-fade">
            <rect y={HORIZON} width="1600" height="310" fill="url(#fade-down)" />
          </mask>
          <filter id="ripple" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.002 0.12" numOctaves="2" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="22" xChannelSelector="R" />
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        <rect y={HORIZON - 170} width="1600" height="176" fill="url(#haze)" />
        <path d={skylinePath(MID)} fill="#1b0e22" />
        <rect y={HORIZON} width="1600" height={1000 - HORIZON} fill="url(#water)" />
        <g data-hero-layer="reflection" mask="url(#reflection-fade)">
          <g filter="url(#ripple)" opacity="0.2">
            <text {...VI_TEXT} textAnchor="end" fill="url(#numeral)" style={fontStyle} transform={`matrix(1 0 0 -1 0 ${HORIZON * 2})`}>VI</text>
          </g>
        </g>
        <g fill="#ffd8b0">
          {GLITTER.map((g, i) => (
            <rect key={i} x={g.x} y={g.y} width={g.w} height={g.h} rx={g.h / 2} opacity={g.o} />
          ))}
        </g>
        <rect y={HORIZON} width="1600" height="1.5" fill="#ffb48c" opacity="0.35" />
      </Layer>

      {/* 4 · Foreground palms and shore */}
      <Layer depth={0.05}>
        <defs>
          {FRONDS.map((f, i) => (
            <g key={i} id={`frond-${i}`}>
              <path d={f.rachis} fill="none" strokeWidth="4" />
              <path d={f.leaves} fill="none" strokeWidth="3.4" />
            </g>
          ))}
        </defs>
        <g fill="#060509" stroke="#060509" strokeLinecap="round">
          <path d="M1210 1000 C 1300 958 1440 938 1610 944 L1610 1000Z" stroke="none" />
          <path d="M-10 960 C 120 930 300 940 420 1000 L-10 1000Z" stroke="none" />
          <Palm x={1556} y={300} base={1592} scale={1.02} />
          <Palm x={1500} y={575} base={1520} scale={0.6} />
          <Palm x={118} y={318} base={82} scale={1.12} />
          <Palm x={286} y={492} base={262} scale={0.74} />
        </g>
      </Layer>
    </div>
  );
}

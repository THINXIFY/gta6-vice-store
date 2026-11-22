import { getImageProps } from "next/image";
import { heroArt } from "@/config/media";
import { isUsable } from "@/lib/media";
import { HeroScene } from "./HeroScene";

/** True once usable (licensed, or pending in local preview) hero art is configured. */
export const hasLicensedArt = isUsable(heroArt.desktop) && isUsable(heroArt.mobile);
/** A second light of the same frame (e.g. morning) that scrolling turns the hero into. */
export const hasSunrise = hasLicensedArt && isUsable(heroArt.scrollTo);

/** A flock of drawn gulls (original art): each wing pair flaps on its own beat (CSS, transform only). */
function Birds() {
  const birds = [
    { x: 0, y: 18, s: 1 },
    { x: 34, y: 4, s: 0.8 },
    { x: 58, y: 26, s: 0.9 },
    { x: 86, y: 10, s: 0.7 },
    { x: 112, y: 22, s: 0.6 },
  ];
  return (
    <svg viewBox="0 0 132 40" className="h-auto w-full overflow-visible" fill="none">
      {birds.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
          <path
            d="M0 4 Q5 -2 10 4 Q15 -2 20 4"
            className="hero-bird origin-center stroke-[rgb(40_24_44/0.75)]"
            strokeWidth={2.2}
            strokeLinecap="round"
            style={{ animationDelay: `${i * -0.17}s`, animationDuration: `${0.55 + (i % 3) * 0.08}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

/**
 * Art-directed hero visual. With licensed art: a <picture> serving a portrait crop
 * below 1024px and a landscape crop above, each with its own focal point.
 * With a second light (heroArt.scrollTo): the morning frame is revealed from the sun outward,
 * with glow, flare, rays and birds anchored to the sun (HeroMotion drives them; all start hidden).
 * Without licensed art: the original illustrated scene.
 */
export function HeroArt() {
  if (!hasLicensedArt) return <HeroScene />;

  const common = { alt: heroArt.desktop.alt, sizes: "100vw", priority: true, quality: 80 };
  const { props: { srcSet: desktopSet } } = getImageProps({ ...common, ...heroArt.desktop });
  const { props: { srcSet: mobileSet, ...img } } = getImageProps({ ...common, ...heroArt.mobile });
  // Second light of the same frame (e.g. morning), revealed by scrolling (HeroMotion). Decorative: same scene.
  const next = hasSunrise ? getImageProps({ ...heroArt.scrollTo!, alt: "", sizes: "100vw", quality: 80 }).props : null;
  const fit = "absolute inset-0 size-full object-cover object-(--hero-focus-mobile) lg:object-(--hero-focus-desktop)";
  const focusVars = { "--hero-focus-mobile": heroArt.focus.mobile, "--hero-focus-desktop": heroArt.focus.desktop } as React.CSSProperties;
  const sun = heroArt.sun ?? { x: heroArt.scrollTo?.width ?? 0, y: (heroArt.scrollTo?.height ?? 0) / 2 };
  // Sun position before measurement (refined to pixels by HeroMotion for the actual crop).
  const sunVars = {
    "--sun-x": `${(sun.x / (heroArt.scrollTo?.width ?? 1)) * 100}%`,
    "--sun-y": `${(sun.y / (heroArt.scrollTo?.height ?? 1)) * 100}%`,
    "--reveal": "0px",
  } as React.CSSProperties;
  // Daylight spreads from the sun: a soft-edged circle whose radius (--reveal) grows with scroll.
  const reveal = "radial-gradient(circle at var(--sun-x) var(--sun-y), #000 calc(var(--reveal) - 22vmax), transparent var(--reveal))";
  const at = { left: "var(--sun-x)", top: "var(--sun-y)" };

  return (
    <div data-hero-scene className="absolute inset-0 origin-[68%_55%]">
      <div data-depth={0.2} data-scroll-zoom className="absolute inset-0 will-change-transform">
        {/* Slow continuous push (GSAP) lives on its own element so it never fights scroll/pointer transforms. */}
        <div
          data-hero-zoom
          data-sun-x={next ? sun.x : undefined}
          data-sun-y={next ? sun.y : undefined}
          data-src-w={next ? heroArt.scrollTo!.width : undefined}
          data-src-h={next ? heroArt.scrollTo!.height : undefined}
          className="absolute inset-0 origin-[60%_60%] will-change-transform"
          style={next ? sunVars : undefined}
        >
          <picture>
            <source media="(min-width: 64rem)" srcSet={desktopSet} />
            <source srcSet={mobileSet} />
            {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is provided via spread props */}
            <img {...img} className={fit} style={focusVars} />
          </picture>
          {next && (
            <>
              {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element -- decorative (alt="") via spread props; optimised srcSet from getImageProps */}
              <img
                {...next}
                data-hero-morning
                aria-hidden
                loading="eager"
                fetchPriority="low"
                className={`${fit} opacity-0`}
                style={{ ...focusVars, maskImage: reveal, WebkitMaskImage: reveal }}
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Colour grade across the sunrise: cool blue before dawn, then a warm golden light from the sun. */}
                <div
                  data-hero-grade-cool
                  className="absolute inset-0 opacity-0 mix-blend-soft-light"
                  style={{ background: "linear-gradient(180deg, rgb(70 110 230) 0%, rgb(40 70 170) 55%, rgb(20 36 110) 100%)" }}
                />
                <div
                  data-hero-grade-warm
                  className="absolute inset-0 opacity-0 mix-blend-soft-light"
                  style={{ background: "radial-gradient(130% 110% at var(--sun-x) var(--sun-y), rgb(255 196 110) 0%, rgb(255 150 90) 38%, rgb(240 110 110) 75%, rgb(200 90 120) 100%)" }}
                />
                {/* Light rays fanning from the sun across the boulevard (wrapper: speed stretch). */}
                <div data-hero-rays-kick className="absolute inset-0" style={{ transformOrigin: "var(--sun-x) var(--sun-y)" }}>
                <div
                  data-hero-rays
                  className="absolute size-[150vmax] -translate-x-1/2 -translate-y-1/2 opacity-0 mix-blend-screen"
                  style={{
                    ...at,
                    background:
                      "repeating-conic-gradient(from 180deg, rgb(255 224 176 / 0) 0deg, rgb(255 224 176 / 0.38) 2.5deg, rgb(255 224 176 / 0) 6deg, rgb(255 224 176 / 0) 13deg)",
                    maskImage: "radial-gradient(circle, #000 6%, transparent 62%)",
                    WebkitMaskImage: "radial-gradient(circle, #000 6%, transparent 62%)",
                  }}
                />
                </div>
                {/* Warm bloom at the horizon. */}
                <div
                  data-hero-glow
                  className="absolute size-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 mix-blend-screen"
                  style={{ ...at, background: "radial-gradient(circle, rgb(255 246 220) 0%, rgb(255 214 150 / 0.85) 6%, rgb(255 160 110 / 0.5) 16%, rgb(255 110 140 / 0.22) 34%, transparent 64%)" }}
                />
                {/* Lens flare: ghosts along the line from the sun toward the centre of the frame. */}
                <div data-hero-flare className="absolute inset-0 opacity-0 mix-blend-screen">
                  {[
                    { t: 0.3, size: "6vmax", c: "rgb(255 214 150 / 0.55)" },
                    { t: 0.55, size: "2.6vmax", c: "rgb(170 200 255 / 0.65)" },
                    { t: 0.8, size: "12vmax", c: "rgb(255 140 190 / 0.24)" },
                    { t: 1.05, size: "4vmax", c: "rgb(255 232 180 / 0.5)" },
                    { t: 1.3, size: "1.8vmax", c: "rgb(200 255 230 / 0.55)" },
                  ].map((g) => (
                    <span
                      key={g.t}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        left: `calc(var(--sun-x) + (50% - var(--sun-x)) * ${g.t})`,
                        top: `calc(var(--sun-y) + (50% - var(--sun-y)) * ${g.t})`,
                        width: g.size,
                        height: g.size,
                        background: `radial-gradient(circle, ${g.c} 0%, transparent 70%)`,
                      }}
                    />
                  ))}
                </div>
                {/* Gulls crossing the dawn sky. */}
                <div data-hero-birds className="absolute top-[26%] left-0 w-[clamp(5rem,11vw,9rem)] -translate-x-full opacity-0">
                  <Birds />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

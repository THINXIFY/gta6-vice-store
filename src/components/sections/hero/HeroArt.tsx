import { getImageProps } from "next/image";
import { heroArt } from "@/config/media";
import { isUsable } from "@/lib/media";
import { HeroScene } from "./HeroScene";

/** True once usable (licensed, or pending in local preview) hero art is configured. */
export const hasLicensedArt = isUsable(heroArt.desktop) && isUsable(heroArt.mobile);

/**
 * Art-directed hero visual. With licensed art: a <picture> serving a portrait crop
 * below 1024px and a landscape crop above, each with its own focal point.
 * Without it: the original illustrated scene.
 */
export function HeroArt() {
  if (!hasLicensedArt) return <HeroScene />;

  const common = { alt: heroArt.desktop.alt, sizes: "100vw", priority: true, quality: 80 };
  const { props: { srcSet: desktopSet } } = getImageProps({ ...common, ...heroArt.desktop });
  const { props: { srcSet: mobileSet, ...img } } = getImageProps({ ...common, ...heroArt.mobile });

  return (
    <div data-hero-scene className="absolute inset-0 origin-[68%_55%]">
      <div data-depth={0.2} data-scroll-zoom className="absolute inset-0 will-change-transform">
        {/* Slow continuous push (GSAP) lives on its own element so it never fights scroll/pointer transforms. */}
        <div data-hero-zoom className="absolute inset-0 origin-[60%_60%] will-change-transform">
          <picture>
            <source media="(min-width: 64rem)" srcSet={desktopSet} />
            <source srcSet={mobileSet} />
            {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is provided via spread props */}
            <img
              {...img}
              className="absolute inset-0 size-full object-cover object-(--hero-focus-mobile) lg:object-(--hero-focus-desktop)"
              style={{ "--hero-focus-mobile": heroArt.focus.mobile, "--hero-focus-desktop": heroArt.focus.desktop } as React.CSSProperties}
            />
          </picture>
        </div>
      </div>
    </div>
  );
}

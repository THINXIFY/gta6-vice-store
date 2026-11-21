import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** The hero's neon palette, as RGB triplets for alpha mixing. */
const tones = {
  vice: "255 87 154",
  lavender: "178 140 255",
  sunset: "255 155 98",
  electric: "76 201 255",
} as const;

export type GlowTone = keyof typeof tones;

type GlowProps = {
  tone: GlowTone;
  /** Position and size utilities, e.g. "-left-40 top-10 size-[40rem]". */
  className?: string;
  /** Peak opacity at the centre. Keep low: these are light, not shapes. */
  strength?: number;
  /** Scroll parallax factor (PageMotion). Positive drifts up faster than the page. */
  speed?: number;
};

/**
 * A soft bloom of neon light carrying the hero's night palette into later sections.
 * Pure gradient (no blur filter), decorative, behind content (`-z-10`, parent must `isolate`).
 */
export function Glow({ tone, className, strength = 0.2, speed = 0.4 }: GlowProps) {
  const a = Math.min(0.6, strength * 1.9);
  const style = {
    backgroundImage: `radial-gradient(closest-side, rgb(${tones[tone]} / ${a}) 0%, rgb(${tones[tone]} / ${a * 0.5}) 40%, rgb(${tones[tone]} / ${a * 0.12}) 75%, transparent 100%)`,
  } as CSSProperties;
  return <div aria-hidden data-glow={speed} className={cn("pointer-events-none absolute -z-10 rounded-full will-change-transform", className)} style={style} />;
}

/**
 * A neon horizon between sections: a hairline that glows at its centre and draws outward
 * as it scrolls into view (PageMotion). Static and fully drawn without motion.
 */
export function NeonRule({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none relative h-px", className)}>
      <div
        data-neon-rule
        className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgb(178_140_255/0.55)_22%,var(--color-vice)_50%,rgb(255_155_98/0.6)_78%,transparent_100%)] shadow-[0_0_22px_2px_rgb(255_87_154/0.4)]"
      />
    </div>
  );
}

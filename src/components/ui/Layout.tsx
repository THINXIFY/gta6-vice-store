import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centered content column with fluid side gutters. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-content px-gutter", className)} {...props} />;
}

const tones = {
  obsidian: "bg-obsidian",
  midnight: "bg-midnight",
  dusk: "bg-dusk",
} as const;

type SectionProps = ComponentProps<"section"> & { tone?: keyof typeof tones; bleed?: boolean };

/** Page section with consistent vertical rhythm. `bleed` removes padding for full-bleed media. */
export function Section({ tone = "obsidian", bleed = false, className, ...props }: SectionProps) {
  return <section className={cn("relative isolate", tones[tone], !bleed && "py-section", className)} {...props} />;
}

const displaySizes = {
  xl: "text-display-xl",
  lg: "text-display-lg",
  md: "text-display-md",
} as const;

type DisplayProps = {
  as?: ElementType;
  size?: keyof typeof displaySizes;
  caps?: boolean;
  className?: string;
  children: ReactNode;
  id?: string;
  /** Opt into the shared masked-rise entrance (PageMotion). Below the fold only. */
  reveal?: boolean;
};

/** Cinematic display headline. Semantic level (`as`) is independent of visual size. */
export function Display({ as: Tag = "h2", size = "lg", caps = true, reveal = false, className, ...props }: DisplayProps) {
  return <Tag data-reveal-heading={reveal || undefined} className={cn("font-display font-extrabold", displaySizes[size], caps && "uppercase", className)} {...props} />;
}

/** Supporting paragraph at lead size, capped at a readable measure. */
export function Lead({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("max-w-measure text-lead text-warm/72", className)} {...props} />;
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "secondary" | "sunset";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold tracking-[0.01em] whitespace-nowrap " +
  "transition-[background-color,background-position,color,transform] duration-500 ease-swift active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-warm text-obsidian hover:bg-white",
  accent: "bg-vice text-obsidian hover:bg-[#ff74ad]",
  secondary: "bg-warm/10 text-warm hover:bg-warm/16",
  /** Signature purchase CTA. Reserve for the main buy action (header + hero). */
  sunset:
    "bg-[linear-gradient(100deg,var(--color-vice)_0%,#ff7a7c_45%,var(--color-sunset)_100%)] bg-[length:140%_100%] bg-left text-obsidian hover:bg-right",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-8 text-base",
};

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };
type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, "className" | "children">;
type AsButton = Common & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

/** Renders a Next.js Link when `href` is set, otherwise a <button type="button">. */
export function Button({ variant = "primary", size = "md", className, children, ...rest }: AsLink | AsButton) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (rest.href !== undefined) {
    return <Link {...(rest as Omit<AsLink, keyof Common>)} className={classes}>{children}</Link>;
  }
  const buttonProps = rest as Omit<AsButton, keyof Common>;
  return <button type="button" {...buttonProps} className={classes}>{children}</button>;
}

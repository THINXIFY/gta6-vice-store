import { brand } from "./brand";

/**
 * The site theme, derived from the nine brand colours. Tailwind utilities keep their token
 * names (obsidian, midnight, vice, sunset, lavender, warm: the original palette) and read these
 * CSS variables, so a client copy only edits src/brand/brand.ts. Values here override the
 * defaults in globals.css `@theme` (which mirror this client and only matter before injection).
 */

const hex = (c: string) => {
  const v = c.replace("#", "");
  const full = v.length === 3 ? [...v].map((x) => x + x).join("") : v;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};
const toHex = (rgb: number[]) => "#" + rgb.map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0")).join("");

/** Mix colour `a` toward `b` by `t` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number) {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i]! - v) * t));
}

const WHITE = "#ffffff";
const c = brand.colors;

/** Every colour token the UI uses, by Tailwind name. */
export const palette = {
  // Core roles (Tailwind names kept from the original palette).
  obsidian: c.base,
  midnight: c.surface,
  vice: c.primary,
  sunset: c.secondary,
  lavender: c.accent,
  warm: c.text,
  /** Midpoint of the primary → secondary gradient. */
  blend: mix(c.primary, c.secondary, 0.5),
  // Status.
  success: c.success,
  "success-soft": mix(c.success, WHITE, 0.25),
  "success-deep": mix(c.success, c.base, 0.78),
  warning: c.warning,
  "warning-soft": mix(c.warning, WHITE, 0.5),
  "danger-soft": c.danger,
  "danger-pale": mix(c.danger, WHITE, 0.3),
  // Admin surfaces: steps between the background and the surface colour.
  // Clear steps: page (darkest) < well (inputs) < panel (cards) < panel-2 (hover, headers).
  admin: mix(c.base, c.surface, 0.18),
  well: mix(c.base, c.surface, 0.1),
  panel: mix(c.surface, c.text, 0.035),
  "panel-2": mix(c.surface, c.text, 0.075),
  line: mix(c.surface, c.text, 0.11),
  "line-strong": mix(c.surface, c.text, 0.2),
} as const;

/** CSS that sets every token (`html:root` outranks the `@theme` defaults wherever they load). */
export const themeCss = `html:root{${Object.entries(palette)
  .map(([k, v]) => `--color-${k}:${v}`)
  .join(";")}}`;

/** Colours for places without CSS variables (emails, generated images). */
export const emailPalette = {
  bg: c.base,
  card: mix(c.base, c.surface, 0.65),
  line: mix(c.surface, c.text, 0.1),
  warm: c.text,
  body: mix(c.text, c.base, 0.18),
  muted: mix(c.text, c.base, 0.42),
  faint: mix(c.text, c.base, 0.6),
  note: mix(c.base, c.surface, 0.95),
  warnBg: mix(c.base, c.warning, 0.12),
  warnText: mix(c.warning, WHITE, 0.5),
  vice: c.primary,
  sunset: c.secondary,
  lavender: c.accent,
} as const;

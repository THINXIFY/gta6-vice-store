import {
  assuranceCopy,
  charactersCopy,
  closingCopy,
  compareCopy,
  deliveryCopy,
  exploreCopy,
  faqCopy,
  galleryCopy,
  heroCopy,
  purchaseCopy,
  trailersCopy,
} from "@/config/content";

/**
 * Editable section wording (WL-4). Defaults come from src/config/content.ts; Admin → Content
 * stores only the fields a client changed (a flat map of "section.field" → text) and they are
 * merged over the defaults. Link targets (`href`) are structure, not wording, and are not editable.
 */
export const defaultCopy = {
  hero: heroCopy,
  purchase: purchaseCopy,
  compare: compareCopy,
  explore: exploreCopy,
  characters: charactersCopy,
  trailers: trailersCopy,
  gallery: galleryCopy,
  assurance: assuranceCopy,
  faq: faqCopy,
  closing: closingCopy,
  delivery: deliveryCopy,
};

/** Same shape as the defaults, with every text widened to string. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type Copy = Widen<typeof defaultCopy>;
export type CopyOverrides = Record<string, string>;

/** Section names for the admin editor, in page order. */
export const COPY_SECTIONS: Record<keyof Copy, string> = {
  hero: "Hero",
  purchase: "Editions and buying",
  compare: "Edition comparison",
  explore: "Game world",
  characters: "Characters",
  trailers: "Trailers",
  gallery: "Gallery",
  assurance: "Good to know",
  faq: "FAQ",
  closing: "Closing call to action",
  delivery: "Delivery note (checkout and order pages)",
};

export type CopyField = { path: string; section: keyof Copy; label: string; value: string };

const humanize = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\./g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bcta\b/gi, "button")
    .replace(/Cta\b/, "button");

/** Every editable text field ("hero.primaryCta.label" …), skipping link targets. */
export function copyFields(copy: Copy = defaultCopy as Copy): CopyField[] {
  const out: CopyField[] = [];
  const walk = (node: unknown, path: string[], section: keyof Copy) => {
    if (typeof node === "string") {
      if (path.at(-1) === "href") return;
      out.push({ path: [section, ...path].join("."), section, label: humanize(path.join(".")), value: node });
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, [...path, k], section);
    }
  };
  for (const section of Object.keys(COPY_SECTIONS) as (keyof Copy)[]) walk(copy[section], [], section);
  return out;
}

const VALID = new Set(copyFields().map((f) => f.path));
export const isCopyPath = (path: string) => VALID.has(path);

/** Defaults with the client's changes applied. Unknown or empty overrides are ignored. */
export function applyCopy(overrides: CopyOverrides): Copy {
  const copy = structuredClone(defaultCopy) as Copy;
  for (const [path, value] of Object.entries(overrides)) {
    if (!VALID.has(path) || typeof value !== "string" || !value.trim()) continue;
    const keys = path.split(".");
    let node = copy as unknown as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) node = node[k] as Record<string, unknown>;
    node[keys.at(-1)!] = value;
  }
  return copy;
}

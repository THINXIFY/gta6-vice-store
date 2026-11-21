/**
 * The home page blocks this codebase can render (WL-3). Each client chooses which are on, their
 * order and menu labels (src/brand/home.ts seeds it; Admin → Homepage manages it).
 * `anchor` is the section id the menu links to; `group` drives the dividers between sections.
 */
export type BlockId = "hero" | "editions" | "compare" | "explore" | "characters" | "trailers" | "gallery" | "assurance" | "faq" | "closing";

export const BLOCKS: Record<BlockId, { name: string; description: string; anchor: string; group: string; required?: boolean }> = {
  hero: { name: "Hero", description: "Opening scene with the title, tagline and buy button.", anchor: "overview", group: "hero", required: true },
  editions: { name: "Editions and buying", description: "Platform and edition picker with price and the buy button.", anchor: "editions", group: "buy", required: true },
  compare: { name: "Edition comparison", description: "Editions side by side with what each includes.", anchor: "compare", group: "buy" },
  explore: { name: "Game world", description: "Large title, scroll scene and regions (needs showcase images).", anchor: "explore", group: "world" },
  characters: { name: "Characters", description: "Character introductions from key art.", anchor: "characters", group: "world" },
  trailers: { name: "Trailers", description: "Official trailers, loaded on click.", anchor: "trailers", group: "media" },
  gallery: { name: "Gallery", description: "Screenshots with a full-screen viewer.", anchor: "gallery", group: "media" },
  assurance: { name: "Good to know", description: "Three or four key facts before buying.", anchor: "how-it-works", group: "trust" },
  faq: { name: "FAQ", description: "Questions and answers, grouped by topic.", anchor: "faq", group: "trust" },
  closing: { name: "Closing call to action", description: "A final buy prompt above the footer.", anchor: "closing", group: "closing" },
};

export const isBlockId = (id: string): id is BlockId => id in BLOCKS;

export type HomeBlock = { id: BlockId; enabled: boolean; sort: number; nav: string };
export type NavItem = { label: string; href: string };

/** Menu items from the enabled blocks that have a label, in page order. */
export function navFrom(blocks: HomeBlock[]): NavItem[] {
  return blocks.filter((b) => b.enabled && b.nav).map((b) => ({ label: b.nav, href: `#${BLOCKS[b.id].anchor}` }));
}

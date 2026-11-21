/**
 * THIS CLIENT'S HOME PAGE: the starting order, visibility and menu labels of the home page blocks
 * (per-client file, see docs/white-label.md). It seeds a new database; after that the layout is
 * managed in Admin → Homepage.
 *
 * Block ids are fixed (see src/lib/blocks.ts for what each one shows). `nav` = menu label, or ""
 * to keep the block out of the menu. Hero and editions are always on (the purchase flow needs them).
 */
export const homeBlocks: readonly { id: string; enabled: boolean; nav: string }[] = [
  { id: "hero", enabled: true, nav: "Home" },
  { id: "editions", enabled: true, nav: "Editions" },
  { id: "compare", enabled: true, nav: "" },
  { id: "explore", enabled: true, nav: "Explore" },
  { id: "characters", enabled: true, nav: "" },
  { id: "trailers", enabled: true, nav: "Trailers" },
  { id: "gallery", enabled: true, nav: "" },
  { id: "assurance", enabled: true, nav: "" },
  { id: "faq", enabled: true, nav: "FAQ" },
  { id: "closing", enabled: true, nav: "" },
];

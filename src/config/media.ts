import { brand } from "@/brand/brand";
const M = "/media/";
const ownArt = `${brand.name}, original AI-generated artwork`;
import type { EditionArtItem, GalleryItem, MediaItem, Trailer } from "./types";

/**
 * Media registry.
 * Images live in public/media (git-ignored; sent to the server with `npm run media:package`).
 * Without an image (empty src), original drawn art is used.
 * `sourceUrl` feeds /credits. Attribution is not permission.
 */

const STORE = "https://store.rockstargames.com/game/buy-gta-vi";
const SITE = "https://www.rockstargames.com/VI";
const rockstar = { credit: "Rockstar Games" } as const;

/** Art-directed hero: separate crops so each composition is framed for its screen. */
export type HeroArt = {
  /** Landscape crop, used from the `lg` breakpoint (≥1024px). Recommended 2880×1620. */
  desktop: MediaItem;
  /** Portrait/4:5 crop, used below `lg`. Recommended 1200×1500. Keep the subject in the top 60%. */
  mobile: MediaItem;
  /** CSS object-position per crop, so the subject stays clear of the copy column. */
  focus: { desktop: string; mobile: string };
  /** True if the licensed art already contains the "VI" logo, which hides the drawn numeral. */
  includesLogo: boolean;
  /**
   * Optional second light of the SAME frame (same framing and size). Scrolling crossfades the hero
   * from the main art into it, e.g. night into morning. Omit for a single image.
   */
  scrollTo?: MediaItem;
  /** Where the sun is in the scrollTo image (source pixels): the sunrise spreads from here. */
  sun?: { x: number; y: number };
};

const viceCitySign: MediaItem = {
  id: "vice-city-01",
  kind: "image",
  alt: "The Vice City sign at dusk as a jet passes low overhead",
  src: M + "gallery-city-sign.jpg",
  width: 3840,
  height: 2160,
  sourceUrl: SITE,
  ...rockstar,
};

/** Night-time hero key frame (supplied by the client; origin and rights unconfirmed). */
const heroNight: MediaItem = {
  id: "hero-night",
  kind: "image",
  alt: "A neon-lit Vice City beachfront boulevard at night: a sports car on the wet road, palm trees, the Oceanview Hotel and the Grand Theft Auto VI logo over the skyline",
  src: M + "hero-night.png",
  width: 1672,
  height: 941,
  credit: ownArt,
};

/** The same beachfront at sunrise (identical framing): scrolling turns night into morning. */
const heroMorning: MediaItem = {
  id: "hero-morning",
  kind: "image",
  alt: "",
  src: M + "hero-morning.png",
  width: 1672,
  height: 941,
  credit: ownArt,
};

export const heroArt: HeroArt = {
  desktop: heroNight,
  mobile: heroNight,
  scrollTo: heroMorning,
  sun: { x: 1598, y: 508 },
  // Desktop: the full boulevard with the logo on the right. Phones: the logo and the road.
  focus: { desktop: "62% 50%", mobile: "88% 50%" },
  includesLogo: true,
};

/**
 * Edition artwork for the purchase panel and comparison (any ratio; panels adopt it).
 * Lookup order: edition + platform, then edition only.
 */
export const editionArt: EditionArtItem[] = [
  {
    edition: "standard",
    image: {
      id: "standard-key-art",
      kind: "image",
      alt: "Grand Theft Auto VI Standard Edition key art over a palm-lined Vice City street",
      src: M + "edition-standard.jpg",
      width: 1280,
      height: 720,
      sourceUrl: STORE,
      ...rockstar,
    },
  },
  {
    edition: "ultimate",
    image: {
      id: "ultimate-key-art",
      kind: "image",
      alt: "Grand Theft Auto VI Ultimate Edition key art against a sunset",
      src: M + "edition-ultimate.jpg",
      width: 1280,
      height: 720,
      sourceUrl: STORE,
      ...rockstar,
    },
  },
];

/** World showcase (Explore). `caption` names only what is visible or officially named. */
export const showcase: (MediaItem & { caption: string })[] = [
  {
    id: "vice-city-sunset",
    kind: "image",
    alt: "Aerial view of Vice City at sunset: the downtown skyline across the bay, neon hotels and a palm-lined boulevard beside the beach",
    caption: "Vice City at sunset",
    src: M + "vice-city-aerial.png",
    width: 1672,
    height: 941,
    credit: ownArt,
  },
  {
    id: "boobie-ike-02",
    kind: "image",
    alt: "Boobie Ike outside the Jack of Hearts club at night, phone in hand",
    caption: "Boobie Ike",
    src: M + "leonida-nightlife.jpg",
    width: 3840,
    height: 2160,
    sourceUrl: SITE,
    ...rockstar,
  },
];

/** Helicopter that flies across the Explore sky with scroll (animated GIF, transparent; decorative). */
export const exploreHelicopter: MediaItem = {
  id: "explore-helicopter",
  kind: "image",
  alt: "",
  src: M + "helicopter.gif",
  width: 491,
  height: 193,
  credit: ownArt,
};

/**
 * Background art per region tile in Explore, keyed by region id. Only an image that actually
 * shows that region belongs here (never a stand-in from elsewhere). Empty src = the tile keeps
 * its tonal look. `focus` = object-position for the tile crop.
 */
const regionScene = (id: string, focus: string): MediaItem & { focus: string } => ({
  id: `region-${id}`,
  kind: "image",
  alt: "",
  src: `${M}region-${id}.png`,
  width: 1672,
  height: 941,
  credit: ownArt,
  focus,
});

export const regionArt: Record<string, MediaItem & { focus?: string }> = {
  "vice-city": { ...showcase[0]!, alt: "", focus: "50% 45%" },
  "leonida-keys": regionScene("leonida-keys", "40% 55%"),
  grassrivers: regionScene("grassrivers", "42% 55%"),
  "port-gellhorn": regionScene("port-gellhorn", "45% 50%"),
  ambrosia: regionScene("ambrosia", "38% 45%"),
  "mount-kalaga": regionScene("mount-kalaga", "35% 50%"),
};

/**
 * Character key art (official, 1280×720; the Launch Trailer's poster). The left 742px hold
 * Jason and Lucia with no logo; each character gets a vertical slice, in source pixels.
 */
export const characterArt = {
  image: {
    id: "jason-lucia-key-art",
    kind: "image",
    alt: "Jason Duval and Lucia Caminos at sunset, Lucia sitting on the hood of a red car",
    src: M + "characters.webp",
    width: 1280,
    height: 720,
    sourceUrl: "https://www.youtube.com/watch?v=rz1B4B2yBZY",
    ...rockstar,
  } satisfies MediaItem,
  slices: { jason: [0, 397], lucia: [397, 742] } as Record<"jason" | "lucia", [number, number]>,
};

/** Portrait key art: the full cast collage. Gallery's tall artwork panel. */
const castKeyArt: MediaItem = {
  id: "key-art-portrait",
  kind: "image",
  alt: "Grand Theft Auto VI key art: a collage of Jason, Lucia and other Leonida characters around the game logo",
  src: M + "key-art-portrait.jpg",
  width: 1212,
  height: 1497,
  sourceUrl: STORE,
  ...rockstar,
};

/** Palm-lined street in duotone violet: backdrop for the closing call to action. */
export const closingBackdrop: MediaItem = {
  id: "palm-street-backdrop",
  kind: "image",
  alt: "",
  src: M + "closing-backdrop.jpg",
  width: 3840,
  height: 1646,
  sourceUrl: STORE,
  ...rockstar,
};

/** Code-in-box packshot: illustrates the FAQ answer explaining the format (not a product we list). */
export const codeInBoxArt: MediaItem = {
  id: "code-in-box",
  kind: "image",
  alt: "Rockstar's Grand Theft Auto VI code-in-box packaging for PlayStation 5",
  src: M + "code-in-box.jpg",
  width: 300,
  height: 374,
  sourceUrl: STORE,
  ...rockstar,
};

/** Link-preview image (Open Graph / social cards), used only when usable. */
export const shareImage: MediaItem = {
  id: "share-image",
  kind: "image",
  alt: "Grand Theft Auto VI key art",
  src: M + "share-image.jpg",
  width: 1200,
  height: 630,
  sourceUrl: STORE,
  ...rockstar,
};

/**
 * Official trailers, played through YouTube's privacy-enhanced embedded player (click to
 * load, nothing rehosted). Checked 2026-11-20 against YouTube watch metadata: channel
 * "Rockstar Games", playableInEmbed=true, oEmbed 200. Only `embeddable` trailers render.
 * `trailerEmbeds` is the business switch: set false if embedding is not approved for you.
 */
export const trailerEmbeds = true;
const yt = { embeddable: true, source: "youtube.com/@RockstarGames" } as const;
export const trailers: Trailer[] = [
  { youtubeId: "rz1B4B2yBZY", title: "Launch Trailer", durationSeconds: 90, published: "2026-10-15", ...yt },
  { youtubeId: "_yl5ELcmugI", title: "Out Now", durationSeconds: 30, published: "2026-11-10", ...yt },
  { youtubeId: "VQRLujxTm3c", title: "Trailer 2", durationSeconds: 167, published: "2025-05-06", ...yt },
  { youtubeId: "QdBZY2fkU-0", title: "Trailer 1", durationSeconds: 90, published: "2023-12-04", ...yt },
];

/**
 * Gallery ("A closer look"): the three official 4K screenshots as close-up details, plus
 * the portrait key art. The viewer opens each full frame.
 */
export const gallery: GalleryItem[] = [
  { ...viceCitySign, caption: "The Vice City sign", detail: { focus: "54% 22%", zoom: 1.9 } },
  { ...showcase[0]!, caption: "Murals under the overpass", detail: { focus: "64% 34%", zoom: 2.4 } },
  { ...showcase[1]!, caption: "The Jack of Hearts", detail: { focus: "78% 4%", zoom: 1.8 } },
  { ...castKeyArt, caption: "Official key art", detail: { focus: "50% 45%", zoom: 1.35 } },
];

/** Every supplied asset in use, with where it appears. Drives /credits. */
export const mediaCredits: { item: MediaItem; title: string; usedIn: string }[] = [
  { item: heroNight, title: "Hero key frame (Vice City beachfront at night)", usedIn: "Hero" },
  { item: heroMorning, title: "Hero key frame at sunrise", usedIn: "Hero (scroll)" },
  { item: viceCitySign, title: "Vice City sign at dusk", usedIn: "Gallery" },
  { item: showcase[0]!, title: "Vice City at sunset (aerial view)", usedIn: "Explore, gallery" },
  { item: exploreHelicopter, title: "Helicopter animation", usedIn: "Explore" },
  { item: regionArt["leonida-keys"]!, title: "Leonida Keys scene", usedIn: "Explore regions" },
  { item: regionArt["grassrivers"]!, title: "Grassrivers scene", usedIn: "Explore regions" },
  { item: regionArt["port-gellhorn"]!, title: "Port Gellhorn scene", usedIn: "Explore regions" },
  { item: regionArt["ambrosia"]!, title: "Ambrosia scene", usedIn: "Explore regions" },
  { item: regionArt["mount-kalaga"]!, title: "Mount Kalaga scene", usedIn: "Explore regions" },
  { item: showcase[1]!, title: "Boobie Ike at the Jack of Hearts", usedIn: "Life in Leonida, gallery" },
  { item: characterArt.image, title: "Jason and Lucia key art", usedIn: "Two lives. One story." },
  { item: editionArt[1]!.image, title: "Ultimate Edition artwork", usedIn: "Purchase panel, edition comparison, purchase bar" },
  { item: editionArt[0]!.image, title: "Standard Edition artwork", usedIn: "Purchase panel, edition comparison, purchase bar" },
  { item: castKeyArt, title: "Portrait key art", usedIn: "Gallery" },
  { item: closingBackdrop, title: "Palm-lined street backdrop", usedIn: "Closing call to action" },
  { item: codeInBoxArt, title: "Code-in-box packaging", usedIn: "FAQ" },
  { item: shareImage, title: "Share image", usedIn: "Link previews" },
];

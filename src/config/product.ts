import type { DeliveryFormat, Edition, EditionId, Platform, PlatformId, Verifiable } from "./types";

/**
 * Single source of truth for product facts.
 * Rule: never set `verified: true` or a price amount without a confirmed source.
 */

export const game = {
  title: "Grand Theft Auto VI",
  shortTitle: "GTA VI",
  developer: { value: "Rockstar Games", verified: true, source: "store.rockstargames.com" } satisfies Verifiable<string>,
  publisher: { value: "Rockstar Games", verified: true, source: "store.rockstargames.com" } satisfies Verifiable<string>,
  /** ISO date. Confirmed 2026-11-20: rockstargames.com/VI "Now Available", Newswire post dated 2026-11-19. */
  releaseDate: { value: "2026-11-19", verified: true, source: "rockstargames.com/VI" } satisfies Verifiable<string>,
  /** "available" = officially released. Says nothing about this store's own stock. */
  releaseStatus: { value: "available", verified: true, source: "rockstargames.com/VI" } satisfies Verifiable<"upcoming" | "available">,
  ageRating: { value: { pegi: "18", esrb: "M" }, verified: false, source: "PEGI 18 shown on reference store" },
  summary:
    "Jason and Lucia's story plays out across the state of Leonida, home to the neon streets of Vice City and beyond.",
} as const;

export const platforms: readonly Platform[] = [
  { id: "ps5", name: "PlayStation 5", shortName: "PS5", available: true, verified: true, source: "rockstargames.com/VI" },
  { id: "xbox-series", name: "Xbox Series X|S", shortName: "Xbox Series X|S", available: true, verified: true, source: "rockstargames.com/VI" },
];

export const defaultPlatform: PlatformId = "ps5";
/** Neutral default: no edition is pushed on the buyer. */
export const defaultEdition: EditionId = "standard";

const CURRENCY = "USD";
/** Provisional retailer prices (GTA-08), minor units. Same on both platforms. */
const price = (amount: number) => ({ amount, currency: CURRENCY });

export const editions: readonly Edition[] = [
  {
    id: "standard",
    name: "Standard Edition",
    summary: "The full game.",
    contents: { value: ["Grand Theft Auto VI"], verified: false },
    prices: { ps5: price(1900), "xbox-series": price(1900) },
  },
  {
    id: "ultimate",
    name: "Ultimate Edition",
    /** Official wording, rockstargames.com/VI. */
    summary: "An exclusive collection of items threaded across all aspects of Jason and Lucia's story.",
    contents: {
      value: ["Grand Theft Auto VI", "Ultimate Edition bonus content (details to be confirmed)"],
      verified: false,
    },
    prices: { ps5: price(3900), "xbox-series": price(3900) },
    recommended: true,
  },
];

export const deliveryFormats: readonly DeliveryFormat[] = ["digital-code"];

export const commerce = {
  /** Master switch. Purchase buttons stay inert until checkout exists and is approved. */
  checkoutEnabled: false,
  currency: CURRENCY,
} as const;

/**
 * What each edition contains. Item names are verbatim from Rockstar's store comparison,
 * verified 2026-11-20 against the RENDERED page (store.rockstargames.com/game/buy-gta-vi):
 * Ultimate shows a check for all 17 items; Standard shows a check only for "Digital
 * Standard Edition" and a cross (struck through) for the other 16.
 * Category grouping and labels are ours (Rockstar lists the items flat).
 */
export const editionContents = {
  verified: true,
  source: "store.rockstargames.com/game/buy-gta-vi (rendered compare table, 2026-11-20)",
  categories: [
    { id: "game", label: "The game", items: [{ name: "Digital Standard Edition", in: ["standard", "ultimate"] }] },
    {
      id: "vehicles",
      label: "Vehicles",
      items: ["’95 Grotti Cheetah", "’67 Vapid Dominator Buggy", "Shitzu Squalo", "Ganado Retro Build", "Jason’s Safehouse Vehicles", "Classic Car Collection"].map(ultimateOnly),
    },
    { id: "weapons", label: "Weapons", items: ["Hawk and Little Morgan Revolvers", "Personalized Weapon Variants"].map(ultimateOnly) },
    { id: "style", label: "Style and gear", items: ["Vice City Styles", "Goodtime Gear"].map(ultimateOnly) },
    {
      id: "places",
      label: "Shops and places",
      items: [
        "Rideout Customs Mod Shop",
        "One-Eyed Willie’s Mod Shop",
        "Sara’s Unisex Salon",
        "Stock 305 Clothing Store",
        "Electric Fang Tattoo Parlor",
        "PTT Youngin$ Compound",
      ].map(ultimateOnly),
    },
  ],
} as const satisfies { verified: boolean; source: string; categories: readonly { id: string; label: string; items: readonly EditionItem[] }[] };

type EditionItem = { name: string; in: readonly EditionId[] };
function ultimateOnly(name: string): EditionItem {
  return { name, in: ["ultimate"] };
}

/**
 * Early purchase bonuses: time-limited, kept separate from permanent edition contents.
 * The reference listed them under both editions, but on 2026-11-20 the rendered store no
 * longer shows them, and eligibility for this retail channel is unknown. Never rendered
 * as available until verified for this store.
 */
export const earlyPurchaseBonuses = {
  verified: false,
  note: "Not listed on Rockstar's store as of 2026-11-20; channel eligibility unconfirmed.",
  groups: [
    { label: "Vintage Vice City early purchase bonuses", items: ["’55 Vapid Stanier Sedan and Garage", "Outfits and Hairstyles", "Exclusive Weapon Pattern"] },
    { label: "Digital store early purchase bonus", items: ["Free Month of GTA+"] },
  ],
} as const;

/** Shown in the purchase panel only once verified. Values are the retailer's own terms. */
export const purchaseDetails: readonly ({ id: string; label: string } & Verifiable<string>)[] = [
  { id: "delivery", label: "Delivery", value: "", verified: false },
  { id: "region", label: "Region", value: "", verified: false },
  { id: "activation", label: "Activation", value: "", verified: false },
];


/**
 * Leonida's regions, named on rockstargames.com/VI ("Only in Leonida", checked 2026-11-20).
 * Rockstar publishes no region descriptions there, so none are shown. Its label is
 * "Mount Kalaga" (not "Mount Kalaga National Park").
 */
export const regions: readonly ({ id: string; name: string } & Pick<Verifiable<string>, "verified" | "source">)[] = [
  { id: "vice-city", name: "Vice City", verified: true, source: "rockstargames.com/VI" },
  { id: "leonida-keys", name: "Leonida Keys", verified: true, source: "rockstargames.com/VI" },
  { id: "grassrivers", name: "Grassrivers", verified: true, source: "rockstargames.com/VI" },
  { id: "port-gellhorn", name: "Port Gellhorn", verified: true, source: "rockstargames.com/VI" },
  { id: "ambrosia", name: "Ambrosia", verified: true, source: "rockstargames.com/VI" },
  { id: "mount-kalaga", name: "Mount Kalaga", verified: true, source: "rockstargames.com/VI" },
];

/** Protagonists. Bios paraphrase rockstargames.com/VI/only-in-leonida/{jason,lucia} (checked 2026-11-20). */
export const characters = [
  {
    id: "jason",
    firstName: "Jason",
    lastName: "Duval",
    bio: "Jason grew up around grifters and crooks. After a stint in the Army, he ended up in the Keys working for local drug runners. He wants an easy life. It keeps getting harder.",
    verified: true,
    source: "rockstargames.com/VI/only-in-leonida/jason",
  },
  {
    id: "lucia",
    firstName: "Lucia",
    lastName: "Caminos",
    bio: "Her father taught her to fight as soon as she could walk. Fighting for her family landed her in the Leonida Penitentiary. Now she's out, with a plan to change the odds in her favor.",
    verified: true,
    source: "rockstargames.com/VI/only-in-leonida/lucia",
  },
] as const;

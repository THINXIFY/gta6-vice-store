/**
 * Content contracts. Every fact that is not yet confirmed carries
 * `verified: false` so the UI can avoid presenting it as settled.
 */

export type Verifiable<T> = { value: T; verified: boolean; source?: string };

export type PlatformId = "ps5" | "xbox-series";

export type Platform = {
  id: PlatformId;
  name: string;
  shortName: string;
  available: boolean;
  verified: boolean;
  source?: string;
};

/** Amount in minor units (cents). `null` = not confirmed; UI shows a placeholder. */
export type Price = { amount: number | null; currency: string };

export type EditionId = "standard" | "ultimate";

export type Edition = {
  id: EditionId;
  name: string;
  summary: string;
  contents: Verifiable<string[]>;
  prices: Record<PlatformId, Price>;
  recommended?: boolean;
};

export type DeliveryFormat = "digital-code" | "physical-code";

export type MediaKind = "image" | "video";

export type MediaItem = {
  id: string;
  kind: MediaKind;
  alt: string;
  /** Path under /public or remote URL. Empty = render placeholder art. */
  src: string;
  poster?: string;
  width: number;
  height: number;
  /**
   * Rights status. Only "original" and "licensed" render on the live site.
   * "pending" = supplied but rights unconfirmed: renders only in local media preview
   * (NEXT_PUBLIC_MEDIA_PREVIEW=1), never in a normal build.
   */
  license: "placeholder" | "original" | "licensed" | "pending";
  /** Rights holder, e.g. "Rockstar Games". */
  credit?: string;
  /** Where the asset was published by its rights holder (for /credits). */
  sourceUrl?: string;
};

/** Official trailer, played through YouTube's privacy-enhanced embedded player. */
export type Trailer = {
  youtubeId: string;
  title: string;
  /** Length in seconds, from YouTube's player metadata. */
  durationSeconds: number;
  /** ISO date YouTube lists as published. */
  published: string;
  /** Embedding allowed by the owner (YouTube playableInEmbed=true, channel verified). */
  embeddable: boolean;
  source: string;
};

/** Gallery still: a full official screenshot plus a close-up framing used in the layout. */
export type GalleryItem = MediaItem & {
  caption: string;
  /** Close-up framing: object-position focus and zoom factor (1 = whole image). */
  detail: { focus: string; zoom: number };
};

/** Edition artwork for the purchase panel. `platform` omitted = used for every platform. */
export type EditionArtItem = { edition: EditionId; platform?: PlatformId; image: MediaItem };

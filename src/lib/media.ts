import type { MediaItem } from "@/config/types";

/**
 * Local design preview of supplied-but-unlicensed media. Set NEXT_PUBLIC_MEDIA_PREVIEW=1
 * in .env.local only; never in a deployed environment. A visible notice is shown while on.
 */
export const mediaPreview = process.env.NEXT_PUBLIC_MEDIA_PREVIEW === "1";

/** True when an asset may be rendered: licensed/original, or "pending" in local preview. */
export function isUsable(item: MediaItem | undefined | null): item is MediaItem {
  if (!item?.src) return false;
  if (item.license === "original" || item.license === "licensed") return true;
  return mediaPreview && item.license === "pending";
}

/** Local review of draft copy (e.g. unconfirmed FAQ answers). Never set in production. */
export const contentPreview = process.env.NEXT_PUBLIC_CONTENT_PREVIEW === "1";

import type { MediaItem } from "@/config/types";

/** True when an asset has a file to show. */
export function isUsable(item: MediaItem | undefined | null): item is MediaItem {
  return Boolean(item?.src);
}

/** Local review of draft copy (e.g. unconfirmed FAQ answers). Never set in production. */
export const contentPreview = process.env.NEXT_PUBLIC_CONTENT_PREVIEW === "1";

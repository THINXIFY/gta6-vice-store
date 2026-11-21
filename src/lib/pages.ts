import { site, type PageId } from "@/config/site";
import { contentPreview } from "@/lib/media";

/** Which information pages are published (Admin → Content; defaults in site.pages). */
export type Published = Record<PageId, boolean>;

/** A page is reachable when published, or as a marked draft in local content preview. */
export const pageAvailable = (id: PageId, published: Published) => published[id] || contentPreview;
export const pageIsDraft = (id: PageId, published: Published) => !published[id];
/** Link target for a page, or "" when it must not be linked (never a dead link). */
export const pageHref = (id: PageId, published: Published) => (pageAvailable(id, published) ? site.pages[id].href : "");

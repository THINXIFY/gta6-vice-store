import { site, type PageId } from "@/config/site";
import { contentPreview } from "@/lib/media";

/** A page is reachable when published, or as a marked draft in local content preview. */
export const pageAvailable = (id: PageId) => site.pages[id].published || contentPreview;
export const pageIsDraft = (id: PageId) => !site.pages[id].published;
/** Link target for a page, or "" when it must not be linked (never a dead link). */
export const pageHref = (id: PageId) => (pageAvailable(id) ? site.pages[id].href : "");

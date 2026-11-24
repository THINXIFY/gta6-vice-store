import { site } from "@/config/site";
import OpengraphImage from "./opengraph-image";

/** X (Twitter) card: the same branded card as Open Graph. */
export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpengraphImage;

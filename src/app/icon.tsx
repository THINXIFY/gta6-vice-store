import { brandMark } from "@/brand/mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: generated from this client's brand (src/brand/brand.ts). */
export default function Icon() {
  return brandMark(64, { rounded: true });
}

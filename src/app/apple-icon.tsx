import { brandMark } from "@/brand/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: generated from this client's brand (src/brand/brand.ts). iOS rounds the corners itself. */
export default function AppleIcon() {
  return brandMark(180);
}

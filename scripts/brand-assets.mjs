/**
 * Builds every logo and icon file from this client's two brand sources (no extra dependencies:
 * sharp ships with Next.js). Run after replacing them: `npm run brand:assets`, then commit the output.
 *
 *   src/brand/assets/logo.png  the full logo (transparent PNG, any size)
 *   src/brand/assets/favicon.png  the supplied favicon (square, transparent PNG), used as supplied
 *
 * Output: public/brand/logo.{png,webp} (site, emails, share image), src/app/favicon.ico (16/32/48),
 * src/app/icon.png (96), src/app/apple-icon.png (180), public/brand/icon-{192,512}.png and
 * icon-maskable-512.png (PWA). Browser-tab icons keep the favicon's own transparent shape; home-screen
 * icons (which must be opaque) place it on a dark tile in the brand base colour.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const brand = readFileSync("src/brand/brand.ts", "utf8");
const base = brand.match(/base:\s*"(#[0-9a-fA-F]{6})"/)?.[1] ?? "#08080D";
const surface = brand.match(/surface:\s*"(#[0-9a-fA-F]{6})"/)?.[1] ?? "#171020";
mkdirSync("public/brand", { recursive: true });

// Logo: trimmed, 1200 px wide (sharp at 3x the largest on-screen size), PNG for emails + WebP.
const logo = sharp("src/brand/assets/logo.png").trim({ threshold: 1 }).resize({ width: 1200 });
const logoPng = await logo.clone().png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toBuffer({ resolveWithObject: true });
writeFileSync("public/brand/logo.png", logoPng.data);
writeFileSync("public/brand/logo.webp", await logo.clone().webp({ quality: 88, alphaQuality: 95, effort: 6 }).toBuffer());
console.log(`logo ${logoPng.info.width}x${logoPng.info.height}`);

const mark = await sharp("src/brand/assets/favicon.png").trim({ threshold: 1 }).toBuffer();

/** The favicon, optionally on a dark tile. `pad` = share of the side left clear; `radius` = corner share (0 = square). */
async function tile(size, { pad, radius, bare = false }) {
  const inner = Math.round(size * (1 - pad * 2));
  const m = await sharp(mark).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  if (bare) {
    return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: m, gravity: "center" }])
      .png({ compressionLevel: 9, palette: size > 48, quality: 92, effort: 10 })
      .toBuffer();
  }
  const r = Math.round(size * radius);
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="72%" cy="18%" r="95%"><stop offset="0" stop-color="${surface}"/><stop offset="1" stop-color="${base}"/></radialGradient></defs><rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/></svg>`,
  );
  return sharp(bg).composite([{ input: m, gravity: "center" }]).png({ compressionLevel: 9, palette: size > 48, quality: 92, effort: 10 }).toBuffer();
}

// favicon.ico: PNG-compressed entries (supported by every current browser).
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) => tile(s, { pad: 0, radius: 0, bare: true })));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((p, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(icoSizes[i] % 256, e);
  header.writeUInt8(icoSizes[i] % 256, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(p.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += p.length;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...pngs]));

writeFileSync("src/app/icon.png", await tile(96, { pad: 0, radius: 0, bare: true }));
// iOS rounds home-screen icons itself: a full square.
writeFileSync("src/app/apple-icon.png", await tile(180, { pad: 0.1, radius: 0 }));
writeFileSync("public/brand/icon-192.png", await tile(192, { pad: 0.08, radius: 0.22 }));
writeFileSync("public/brand/icon-512.png", await tile(512, { pad: 0.08, radius: 0.22 }));
// Maskable: full bleed, the mark inside the 80% safe zone.
writeFileSync("public/brand/icon-maskable-512.png", await tile(512, { pad: 0.16, radius: 0 }));
console.log("icons written");

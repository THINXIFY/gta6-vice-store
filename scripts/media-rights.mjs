/**
 * Rights register reader shared by the media scripts (same rule as src/lib/mediaRights.ts).
 * A file is authorised only when src/config/media-rights.json records it as:
 *  - "licensed" with `permission` (where the written commercial-use permission is filed), or
 *  - "original" with `permission` (owner's statement), `thirdPartyMarks: []` and a non-Rockstar origin.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadRights(root = process.cwd()) {
  const { assets } = JSON.parse(readFileSync(join(root, "src", "config", "media-rights.json"), "utf8"));
  return assets.map((e) => {
    let ok = false;
    let reason = "pending: no permission recorded";
    if (e.permission?.trim()) {
      if (e.status === "licensed") ok = true;
      else if (e.status === "original") {
        if (/rockstar/i.test(e.origin)) reason = "official Rockstar material cannot be 'original': it needs a licence";
        else if (!Array.isArray(e.thirdPartyMarks) || e.thirdPartyMarks.length) reason = "'original' needs thirdPartyMarks confirmed as []";
        else ok = true;
      } else reason = `status "${e.status}" is not licensed/original`;
    }
    return { ...e, authorised: ok, reason: ok ? e.status : reason };
  });
}

/**
 * Makes public/media hold exactly the authorised register files: copies them byte-for-byte from
 * media-pending/ when that folder exists (the owner's machine), verifies each by SHA-256, and
 * removes register files that are not (or no longer) authorised. Other files are left alone.
 */
export async function syncAuthorised(root = process.cwd()) {
  const { createHash } = await import("node:crypto");
  const { copyFileSync, existsSync, mkdirSync, rmSync } = await import("node:fs");
  const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
  const rights = loadRights(root);
  const pending = join(root, "media-pending");
  const target = join(root, "public", "media");
  const out = [];
  for (const e of rights) {
    const dest = join(target, e.file);
    if (!e.authorised) {
      if (existsSync(dest)) rmSync(dest);
      continue;
    }
    const src = join(pending, e.file);
    if (existsSync(src)) {
      mkdirSync(target, { recursive: true });
      if (!existsSync(dest) || hash(src) !== hash(dest)) copyFileSync(src, dest);
      if (hash(src) !== hash(dest)) throw new Error(`Copy of ${e.file} does not match its source.`);
    }
    out.push({ ...e, present: existsSync(dest), sha256: existsSync(dest) ? hash(dest) : "" });
  }
  return { rights, authorised: out };
}

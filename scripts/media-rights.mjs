/**
 * Cleared-media list shared by the media scripts: read from src/lib/mediaRights.ts (between the
 * `rights:start` / `rights:end` markers), the same list the site uses.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

export function loadCleared(root = process.cwd()) {
  const src = readFileSync(join(root, "src", "lib", "mediaRights.ts"), "utf8");
  const block = src.split("// rights:start")[1]?.split("// rights:end")[0];
  if (!block) throw new Error("src/lib/mediaRights.ts: rights markers not found.");
  return [...block.matchAll(/"([^"]+)":\s*"(original|licensed)"/g)].map(([, file, status]) => ({ file, status }));
}

/**
 * Makes public/media hold exactly the cleared files: copies them byte-for-byte from media-pending/
 * when that folder exists (the owner's machine), verifies each by SHA-256, and removes any other
 * image from public/media (the folder is managed: git-ignored, filled only from this list).
 */
export function syncAuthorised(root = process.cwd()) {
  const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
  const cleared = loadCleared(root);
  const pending = join(root, "media-pending");
  const target = join(root, "public", "media");
  const names = new Set(cleared.map((e) => e.file));
  if (existsSync(target)) {
    for (const f of readdirSync(target)) if (f !== "SHA256SUMS" && !names.has(f)) rmSync(join(target, f), { recursive: true });
  }
  const authorised = cleared.map((e) => {
    const src = join(pending, e.file);
    const dest = join(target, e.file);
    if (existsSync(src)) {
      mkdirSync(target, { recursive: true });
      if (!existsSync(dest) || hash(src) !== hash(dest)) copyFileSync(src, dest);
      if (hash(src) !== hash(dest)) throw new Error(`Copy of ${e.file} does not match its source.`);
    }
    return { ...e, present: existsSync(dest), sha256: existsSync(dest) ? hash(dest) : "" };
  });
  return { authorised };
}

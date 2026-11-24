/**
 * Keeps unlicensed media out of anything that can be deployed.
 *
 * Supplied files whose rights are unconfirmed live in /media-pending (git-ignored, outside
 * /public, so never served or bundled). Runs before `dev` and `build`:
 *  - NEXT_PUBLIC_MEDIA_PREVIEW=1 → copies them to /public/preview-media (git-ignored) for a
 *    local design preview only;
 *  - otherwise → deletes /public/preview-media, so a normal build contains none of them.
 * Refuses to build with media or content preview on while marked indexable (a production
 * misconfiguration).
 * Authorised files (src/config/media-rights.json) are kept in /public/media, byte-for-byte;
 * register files that are not authorised are removed from it.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import { syncAuthorised } from "./media-rights.mjs";

const root = process.cwd();
nextEnv.loadEnvConfig(root, process.env.npm_lifecycle_event === "predev");

const preview = process.env.NEXT_PUBLIC_MEDIA_PREVIEW === "1";
const source = join(root, "media-pending");
const target = join(root, "public", "preview-media");

const contentPreview = process.env.NEXT_PUBLIC_CONTENT_PREVIEW === "1";
if ((preview || contentPreview) && process.env.NEXT_PUBLIC_INDEXABLE === "true") {
  console.error("✖ Media/content preview cannot be combined with NEXT_PUBLIC_INDEXABLE=true. Unset the preview flags for production.");
  process.exit(1);
}

// Never lose files someone dropped straight into public/preview-media: adopt them first.
if (existsSync(target)) {
  mkdirSync(source, { recursive: true });
  for (const f of readdirSync(target, { withFileTypes: true })) {
    if (f.isFile() && !existsSync(join(source, f.name))) {
      copyFileSync(join(target, f.name), join(source, f.name));
      console.log("Adopted public/preview-media/" + f.name + " into media-pending/");
    }
  }
}
rmSync(target, { recursive: true, force: true });
if (preview && existsSync(source)) {
  cpSync(source, target, { recursive: true });
  console.log("⚠ Media preview ON: unlicensed media copied to public/preview-media (local only, never deploy this build).");
} else {
  console.log("✓ Media preview off: no unlicensed media in public/.");
}

const { authorised } = await syncAuthorised(root);
console.log(`✓ Authorised artwork in public/media: ${authorised.filter((e) => e.present).length} file(s).`);

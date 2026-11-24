/**
 * `npm run media:package`: packs the cleared supplied images (src/lib/mediaRights.ts) for the
 * server, unchanged, with SHA-256 sums:
 *   deploy-package/vice-store-media.tar.gz  (extracts to public/media/)
 * Files that are not cleared are never packaged.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { syncAuthorised } from "./media-rights.mjs";

const root = process.cwd();
const { authorised } = syncAuthorised(root);

console.log("\nCleared artwork (src/lib/mediaRights.ts)\n");
for (const e of authorised) console.log(`${e.present ? "✓" : "✖ missing"}  ${e.file}  (${e.status})`);

const out = join(root, "deploy-package");
rmSync(out, { recursive: true, force: true });
const missing = authorised.filter((e) => !e.present);
if (missing.length) {
  console.error(`\n✖ Cleared but missing from media-pending/ and public/media/: ${missing.map((e) => e.file).join(", ")}`);
  process.exit(1);
}
if (!authorised.length) {
  console.log("\nNothing cleared yet: nothing to package. The live site uses the original drawn art.");
  process.exit(0);
}
mkdirSync(out, { recursive: true });
writeFileSync(join(root, "public", "media", "SHA256SUMS"), authorised.map((e) => `${e.sha256}  ${e.file}`).join("\n") + "\n");
// Relative paths: some Windows tar builds read "C:" as a remote host.
execFileSync("tar", ["-czf", "deploy-package/vice-store-media.tar.gz", "-C", "public/media", "SHA256SUMS", ...authorised.map((e) => e.file)], { cwd: root, stdio: "inherit" });
console.log(`\n✓ Packaged ${authorised.length} file(s): deploy-package/vice-store-media.tar.gz`);

/**
 * `npm run media:package`: shows the rights status of every supplied image and packages the
 * authorised ones (src/config/media-rights.json) for the server, unchanged, with SHA-256 sums:
 *   deploy-package/vice-store-media.tar.gz  (extracts to public/media/)
 * Pending (unlicensed) files are never packaged.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { syncAuthorised } from "./media-rights.mjs";

const root = process.cwd();
const { rights, authorised } = await syncAuthorised(root);

console.log("\nSupplied artwork rights (src/config/media-rights.json)\n");
for (const e of rights) console.log(`${e.authorised ? "✓ AUTHORISED" : "✗ excluded  "}  ${e.file}\n               ${e.usedIn}: ${e.reason}`);

const out = join(root, "deploy-package");
rmSync(out, { recursive: true, force: true });
const ready = authorised.filter((e) => e.present);
const missing = authorised.filter((e) => !e.present);
if (missing.length) {
  console.error(`\n✖ Authorised but missing from media-pending/ and public/media/: ${missing.map((e) => e.file).join(", ")}`);
  process.exit(1);
}
if (!ready.length) {
  console.log("\nNo authorised artwork yet: nothing to package. The live site uses the original drawn art.");
  process.exit(0);
}
mkdirSync(out, { recursive: true });
writeFileSync(join(root, "public", "media", "SHA256SUMS"), ready.map((e) => `${e.sha256}  ${e.file}`).join("\n") + "\n");
// Relative paths: some Windows tar builds read "C:" as a remote host.
execFileSync("tar", ["-czf", "deploy-package/vice-store-media.tar.gz", "-C", "public/media", "SHA256SUMS", ...ready.map((e) => e.file)], { cwd: root, stdio: "inherit" });
console.log(`\n✓ Packaged ${ready.length} authorised file(s): deploy-package/vice-store-media.tar.gz`);

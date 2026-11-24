/**
 * `npm run media:package`: packs every image in public/media (git-ignored) for the server,
 * unchanged, with SHA-256 sums: deploy-package/vice-store-media.tar.gz (extracts to public/media/).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dir = join(root, "public", "media");
const files = readdirSync(dir).filter((f) => f !== "SHA256SUMS").sort();
if (!files.length) {
  console.log("public/media is empty: nothing to package.");
  process.exit(0);
}
const sums = files.map((f) => `${createHash("sha256").update(readFileSync(join(dir, f))).digest("hex")}  ${f}`);
writeFileSync(join(dir, "SHA256SUMS"), sums.join("\n") + "\n");
rmSync(join(root, "deploy-package"), { recursive: true, force: true });
mkdirSync(join(root, "deploy-package"));
// Relative paths: some Windows tar builds read "C:" as a remote host.
execFileSync("tar", ["-czf", "deploy-package/vice-store-media.tar.gz", "-C", "public/media", "SHA256SUMS", ...files], { cwd: root, stdio: "inherit" });
console.log(`✓ Packaged ${files.length} image(s): deploy-package/vice-store-media.tar.gz`);

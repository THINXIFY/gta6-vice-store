/**
 * New client setup (WL-6): rewrites this copy's brand file from a few answers.
 *
 *   npm run new-client -- --name "NOVA KEYS" --primary "#3d8bff" --secondary "#2de2c4"
 *
 * Options (all optional except --name):
 *   --name          Store name                         --wordmark "NOVA,KEYS" (default: split name)
 *   --monogram      1–2 characters for icons            --tagline, --title, --description
 *   --legal-name    Seller legal name                   --support-email
 *   --base --surface --primary --secondary --accent --text --success --warning --danger  (#rrggbb)
 *   --dry-run       Show the changes without writing     --file <path> (default src/brand/brand.ts)
 *
 * Fonts, the starting catalogue, home layout, payment methods and content stay as they are; the
 * printed checklist says where each lives. Run it in the client's own copy of the code.
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const get = (k) => {
  const i = args.indexOf(`--${k}`);
  return i > -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const name = get("name")?.trim();
if (!name) fail('Give the store name: npm run new-client -- --name "NOVA KEYS"');
if (name.length > 40) fail("Keep the store name to 40 characters.");
const file = get("file") ?? "src/brand/brand.ts";
const words = name.split(/\s+/);
const wordmark = (get("wordmark") ?? (words.length > 1 ? `${words.slice(0, -1).join(" ")},${words.at(-1)}` : `${name},`)).split(",").map((w) => w.trim());
if (wordmark.length !== 2) fail('--wordmark takes two parts separated by a comma, e.g. "NOVA,KEYS".');
const monogram = get("monogram") ?? name.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase();
if (!monogram || monogram.length > 2) fail("--monogram must be 1 or 2 characters.");
const email = get("support-email");
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("--support-email is not a valid email address.");

const str = (v) => JSON.stringify(v);
let src = readFileSync(file, "utf8").replace(/\r/g, "");
const changes = [];
/** Replaces the value of `key: "…"` (first match only) inside the brand object. */
const setString = (key, value, scope = src) => {
  const re = new RegExp(`(\\n\\s*${key}: )"(?:[^"\\\\]|\\\\.)*"`);
  if (!re.test(scope)) fail(`Could not find "${key}" in ${file}.`);
  src = src.replace(re, `$1${str(value)}`);
  changes.push(`${key} = ${str(value)}`);
};

setString("name", name);
src = src.replace(/(\n\s*wordmark: )\[[^\]]*\]/, `$1[${str(wordmark[0])}, ${str(wordmark[1])}]`);
changes.push(`wordmark = [${wordmark.map(str).join(", ")}]`);
setString("monogram", monogram);
for (const k of ["tagline", "title", "description"]) if (get(k)) setString(k, get(k));
if (get("legal-name")) setString("legalName", get("legal-name"));
if (email) {
  setString("supportEmail", email);
}
for (const k of ["base", "surface", "primary", "secondary", "accent", "text", "success", "warning", "danger"]) {
  const v = get(k);
  if (!v) continue;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) fail(`--${k} must be a colour like #3d8bff.`);
  setString(k, v.toLowerCase());
}

console.log(`${args.includes("--dry-run") ? "Would set" : "Set"} in ${file}:\n  ${changes.join("\n  ")}`);
if (!args.includes("--dry-run")) writeFileSync(file, src);

console.log(`
Next steps for ${name} (details in docs/white-label.md and docs/deploy.md):
  1. Fonts: src/brand/fonts.ts and src/brand/fonts/*.woff (optional).
  2. Starting catalogue: src/config/product.ts, or Admin → Catalogue after the first start.
  3. Home layout: src/brand/home.ts, or Admin → Homepage.
  4. Wording and legal pages: Admin → Content (publish Terms, Privacy and Refund once confirmed).
  5. Payment methods: src/brand/payments.ts, then real addresses in Admin → Wallets (never in code).
  6. Server settings: copy .env.example to the host's environment (domain, database, secrets, SMTP).
  7. Open Admin → Launch checklist until every required item is ready.`);

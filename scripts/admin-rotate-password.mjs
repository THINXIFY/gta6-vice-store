/**
 * Rotates an admin password on the server (e.g. after it was exposed):
 *   node scripts/admin-rotate-password.mjs owner@example.com
 * Generates a strong random password, ends that admin's sessions, writes an audit entry and
 * saves the new password to a git-ignored file under .data/ (never printed to the terminal).
 * Requires direct database access. Stop the app first when using the embedded PGlite database.
 */
import { randomBytes, scrypt } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import nextEnv from "@next/env";
import { acquirePgliteLock } from "./pglite-lock.mjs";

nextEnv.loadEnvConfig(process.cwd());
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/admin-rotate-password.mjs <admin email>");
  process.exit(1);
}

// Same format and parameters as src/server/auth.ts hashPassword().
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const password = Array.from(randomBytes(24), (b) => ALPHABET[b % ALPHABET.length])
  .join("")
  .replace(/(.{6})(?=.)/g, "$1-");
const salt = randomBytes(16);
const hash = await promisify(scrypt)(password, salt, 32, PARAMS);
const stored = ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");

let query, close;
if (process.env.DATABASE_URL) {
  const { default: postgres } = await import("postgres");
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  query = (text, params) => client.unsafe(text, params);
  close = () => client.end();
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
  acquirePgliteLock(dir);
  const client = await PGlite.create(dir);
  query = async (text, params) => (await client.query(text, params)).rows;
  close = () => client.close();
}

const rows = await query("update admin_users set password_hash = $2 where lower(email) = $1 returning id", [email, stored]);
if (!rows.length) {
  console.error(`No admin with the email ${email}.`);
  process.exitCode = 1;
} else {
  await query("delete from admin_sessions where admin_id = $1", [rows[0].id]);
  await query("insert into audit_logs (actor, action, entity, entity_id) values ('system:cli', 'admin.password_rotated', 'admin', $1)", [rows[0].id]);
  mkdirSync(".data", { recursive: true });
  const file = path.join(".data", `admin-password-${email.replace(/[^a-z0-9]+/g, "_")}.txt`);
  writeFileSync(file, `${email}\n${password}\n\nRotated ${new Date().toISOString()}. Sign in, then delete this file.\n`, { mode: 0o600 });
  console.log(`✓ Password rotated for ${email}; sessions ended. New password saved to ${file} (git-ignored).`);
}
await close();

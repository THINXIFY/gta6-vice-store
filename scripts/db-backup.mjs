/**
 * Database backup (WL-6). `npm run db:backup [-- --dir <folder>] [-- --keep <n>]`
 *
 * - DATABASE_URL set (production): runs `pg_dump --format=custom` (PostgreSQL client tools must be
 *   installed) into <dir>/backup-<timestamp>.dump. Restore with
 *   `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>`.
 * - Otherwise: copies the embedded PGlite folder (PGLITE_DIR, default .data/pglite) into
 *   <dir>/pglite-<timestamp>. It holds the database lock while copying, so it refuses while a dev
 *   server has the database open (stop it first). Restore by replacing the folder with the copy.
 *
 * Payment screenshots and encrypted codes are inside the database, so one backup covers them.
 * Keeps the newest <keep> backups in <dir> (default 14) and deletes older ones made by this script.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { acquirePgliteLock } from "./pglite-lock.mjs";

nextEnv.loadEnvConfig(process.cwd());
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const dir = path.resolve(arg("dir", process.env.BACKUP_DIR || path.join(".data", "backups")));
const keep = Math.max(1, Number(arg("keep", "14")) || 14);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "");
mkdirSync(dir, { recursive: true });

let made;
if (process.env.DATABASE_URL) {
  made = path.join(dir, `backup-${stamp}.dump`);
  const r = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--file", made, process.env.DATABASE_URL], { stdio: "inherit" });
  if (r.error?.code === "ENOENT") {
    console.error("✗ pg_dump was not found. Install the PostgreSQL client tools (same major version as the server), or use your host's managed backups.");
    process.exit(1);
  }
  if (r.status !== 0) {
    rmSync(made, { force: true });
    console.error("✗ pg_dump failed (see above). No backup was written.");
    process.exit(r.status ?? 1);
  }
} else {
  const source = path.resolve(process.env.PGLITE_DIR || path.join(".data", "pglite"));
  if (!existsSync(source)) {
    console.error(`✗ No database folder at ${source}.`);
    process.exit(1);
  }
  let release;
  try {
    release = acquirePgliteLock(source);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  made = path.join(dir, `pglite-${stamp}`);
  try {
    cpSync(source, made, { recursive: true });
  } finally {
    release?.();
  }
}

// Retention: newest `keep` backups made by this script.
const ours = readdirSync(dir)
  .filter((f) => /^(backup-.*\.dump|pglite-\d{4}-)/.test(f))
  .map((f) => ({ f, t: statSync(path.join(dir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
for (const old of ours.slice(keep)) rmSync(path.join(dir, old.f), { recursive: true, force: true });

console.log(`✓ Backup written: ${made}${ours.length > keep ? ` (removed ${ours.length - keep} older)` : ""}`);

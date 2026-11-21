import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { acquirePgliteLock } from "../../scripts/pglite-lock.mjs";
import { seed } from "./seed";

/** Driver-agnostic Postgres database type (postgres.js in production, PGlite locally). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as typeof globalThis & { __viceDb?: Promise<Db> };

/**
 * DATABASE_URL set → PostgreSQL via postgres.js (migrations applied by `npm run db:migrate`; the
 *   idempotent seed runs on first use, as with PGlite).
 * Not set → embedded PGlite at PGLITE_DIR (default .data/pglite) for local development and
 * tests; migrations and seed data are applied automatically on first use.
 */
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const db = drizzlePostgres(postgres(url, { max: 10, prepare: false }), { schema }) as unknown as Db;
    // Same idempotent seed as PGlite: a fresh production database gets the product, layout and
    // starting (test) payment methods; existing rows and admin changes are never overwritten.
    // Not during `next build` (no database work while prerendering).
    if (process.env.NEXT_PHASE !== "phase-production-build") await seed(db);
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // `next build` prerenders in several worker processes; the embedded DB must never be opened
  // there (callers such as the catalogue fall back to config). Pages read it per request.
  if (process.env.NEXT_PHASE === "phase-production-build") throw new Error("The embedded database is not opened during next build.");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (dir !== "memory://") {
    mkdirSync(dir, { recursive: true });
    acquirePgliteLock(dir); // one process per database folder (PGlite is not multi-process safe)
  }
  const client = await PGlite.create(dir === "memory://" ? undefined : dir);
  const db = drizzlePglite(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seed(db);
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  g.__viceDb ??= connect().catch((err) => {
    g.__viceDb = undefined;
    throw err;
  });
  return g.__viceDb;
}

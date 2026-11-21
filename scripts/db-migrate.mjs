/**
 * Applies drizzle/ migrations. DATABASE_URL → PostgreSQL; otherwise the local PGlite store.
 * Catalogue seeding happens in the app (idempotent, never overwrites existing prices/wallets).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { acquirePgliteLock } from "./pglite-lock.mjs";

nextEnv.loadEnvConfig(process.cwd());
const migrationsFolder = path.join(process.cwd(), "drizzle");

if (process.env.DATABASE_URL) {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder });
  await client.end();
  console.log("✓ Migrations applied to PostgreSQL.");
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  acquirePgliteLock(dir);
  const client = await PGlite.create(dir);
  await migrate(drizzle(client), { migrationsFolder });
  await client.close();
  console.log(`✓ Migrations applied to PGlite at ${dir}.`);
}

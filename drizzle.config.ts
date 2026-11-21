import { defineConfig } from "drizzle-kit";

/** Migrations are generated from src/db/schema.ts into drizzle/ and applied by scripts/db-migrate.mjs. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  strict: true,
});

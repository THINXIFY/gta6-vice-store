/**
 * Server-side recovery when the only owner has lost their authenticator:
 *   node scripts/admin-reset-2fa.mjs owner@example.com
 * Turns off two-factor for that admin, ends their sessions and writes an audit entry.
 * Requires direct database access (the server's environment), so it is never reachable
 * from the web. Stop the app first when using the embedded PGlite database.
 */
import path from "node:path";
import nextEnv from "@next/env";
import { acquirePgliteLock } from "./pglite-lock.mjs";

nextEnv.loadEnvConfig(process.cwd());
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/admin-reset-2fa.mjs <admin email>");
  process.exit(1);
}

const sql = {
  reset: "update admin_users set totp_secret = null, totp_pending = null where lower(email) = $1 returning id",
  sessions: "delete from admin_sessions where admin_id = $1",
  audit: "insert into audit_logs (actor, action, entity, entity_id) values ('system:cli', 'admin.2fa_reset', 'admin', $1)",
};

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

const rows = await query(sql.reset, [email]);
if (!rows.length) {
  console.error(`No admin with the email ${email}.`);
} else {
  await query(sql.sessions, [rows[0].id]);
  await query(sql.audit, [rows[0].id]);
  console.log(`✓ Two-factor turned off for ${email}. They can sign in with their password and set it up again.`);
}
await close();

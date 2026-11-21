import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 256-bit access key, base64url. Shown to the customer once; only its hash is stored. */
export function newAccessKey(): string {
  return randomBytes(32).toString("base64url");
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function keyMatches(key: string | undefined, storedHash: string): boolean {
  if (!key || !/^[A-Za-z0-9_-]{43}$/.test(key)) return false;
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Salted IP hash for audit logs (raw IPs are never stored). */
export function ipHash(ip: string): string {
  return createHash("sha256")
    .update(`${process.env.IP_HASH_SALT ?? "dev-salt"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Client IP for rate limiting/audit. Forwarding headers are client-controlled, so they are
 * trusted only when TRUST_PROXY=1 (set this only behind a proxy that overwrites them).
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "direct";
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "direct";
}

// ── Rate limiting ───────────────────────────────────────────────────────────
// Shared fixed-window counter in PostgreSQL (one atomic upsert per request), so limits
// hold across server instances. Expired rows are pruned opportunistically.

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  const { getDb } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const db = await getDb();
  const reset = new Date(Date.now() + windowMs);
  type R = { count: number; reset_at: string | Date };
  const result = (await db.execute(sql`
    insert into rate_limits (key, count, reset_at) values (${key}, 1, ${reset.toISOString()})
    on conflict (key) do update set
      count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
    returning count, reset_at`)) as unknown as R[] | { rows: R[] };
  // postgres.js returns an array; PGlite returns { rows }.
  const row = (Array.isArray(result) ? result[0] : result.rows[0])!;
  if (Math.random() < 0.01) await db.execute(sql`delete from rate_limits where reset_at < now() - interval '1 hour'`);
  return { ok: Number(row.count) <= limit, retryAfter: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)) };
}

// ── Input validation ────────────────────────────────────────────────────────

export class InputError extends Error {}

export function str(v: unknown, field: string, max = 200): string {
  if (typeof v !== "string") throw new InputError(`${field} is required.`);
  const s = v.trim();
  if (!s || s.length > max) throw new InputError(`${field} is invalid.`);
  return s;
}

export function email(v: unknown): string {
  const s = str(v, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw new InputError("Enter a valid email address.");
  return s;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new InputError(`${field} is invalid.`);
  return v as T;
}

/** Reads a JSON body (max ~4 KB) or throws InputError. */
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 4096) throw new InputError("Request too large.");
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new InputError("Invalid request.");
  }
}

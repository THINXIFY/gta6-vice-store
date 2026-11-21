import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import * as s from "@/db/schema";
import { getDb } from "./db";
import { hashKey, ipHash } from "./security";
import { verifyTotp } from "./totp";
import { open } from "./vault";

/**
 * Admin authentication: scrypt password hashes, random session tokens stored only as
 * SHA-256, httpOnly + Secure + SameSite=Strict cookie scoped to /admin, 8-hour sessions.
 * Every admin page and action calls requireAdmin(); role checks are server-side.
 * Two-factor (TOTP) is per admin; ADMIN_REQUIRE_2FA=1 makes it mandatory (admins without it
 * can only reach Settings to enroll).
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = "vice_admin";
const SESSION_HOURS = 8;
export const MIN_PASSWORD = 12;

export type Admin = { id: string; email: string; role: "owner" | "reviewer"; twoFactor: boolean };
export const require2fa = () => process.env.ADMIN_REQUIRE_2FA === "1";

/**
 * Accepts a TOTP code for an admin exactly once: the step is stored atomically, so the same
 * code (or an older one) can never be used again, even by concurrent requests.
 */
export async function acceptTotp(adminId: string, sealedSecret: string, code: string, lastStep: number | null): Promise<boolean> {
  const step = verifyTotp(open(sealedSecret), code, lastStep);
  if (step === null) return false;
  const db = await getDb();
  const updated = await db
    .update(s.adminUsers)
    .set({ totpLastStep: step })
    .where(and(eq(s.adminUsers.id, adminId), or(isNull(s.adminUsers.totpLastStep), lt(s.adminUsers.totpLastStep, step))))
    .returning({ id: s.adminUsers.id });
  return updated.length === 1;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, N, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Dummy hash so unknown emails take as long as wrong passwords (no user enumeration by timing). */
let dummy: Promise<string> | undefined;
const dummyHash = () => (dummy ??= hashPassword(randomBytes(16).toString("hex")));

/**
 * First-run bootstrap: if no admin exists and ADMIN_BOOTSTRAP_EMAIL/PASSWORD are set, create
 * the owner. Remove those env vars after first login.
 */
export async function bootstrapAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;
  if (password.length < MIN_PASSWORD) throw new Error(`ADMIN_BOOTSTRAP_PASSWORD must be at least ${MIN_PASSWORD} characters.`);
  const db = await getDb();
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(s.adminUsers)) as [{ n: number }];
  if (n > 0) return;
  await db.insert(s.adminUsers).values({ email, passwordHash: await hashPassword(password), role: "owner" }).onConflictDoNothing();
  await db.insert(s.auditLogs).values({ actor: "system", action: "admin.bootstrap", entity: "admin", entityId: email });
}

export async function requestIpHash(): Promise<string> {
  const h = await headers();
  const ip = process.env.TRUST_PROXY === "1" ? h.get("x-forwarded-for")?.split(",")[0]?.trim() || "direct" : "direct";
  return ipHash(ip);
}

/** Password, then (if enrolled) a one-time code. "code_required" means the password was right. */
export async function login(email: string, password: string, code?: string): Promise<Admin | "code_required" | null> {
  const db = await getDb();
  const [user] = await db.select().from(s.adminUsers).where(eq(sql`lower(${s.adminUsers.email})`, email.trim().toLowerCase()));
  const passwordOk = user && user.active ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyHash()), false);
  const ip = await requestIpHash();
  const log = (action: string) => db.insert(s.auditLogs).values({ actor: user ? `admin:${user.email}` : "anonymous", action, entity: "admin", entityId: email.slice(0, 254), ipHash: ip });
  if (!passwordOk || !user) {
    await log("admin.login_failed");
    return null;
  }
  if (user.totpSecret) {
    if (!code) return "code_required";
    if (!(await acceptTotp(user.id, user.totpSecret, code, user.totpLastStep))) {
      await log("admin.login_failed_2fa");
      return null;
    }
  }
  await log("admin.login");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.insert(s.adminSessions).values({ adminId: user.id, tokenHash: hashKey(token), expiresAt, ipHash: ip });
  await db.update(s.adminUsers).set({ lastLoginAt: new Date() }).where(eq(s.adminUsers.id, user.id));
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", expires: expiresAt });
  return { id: user.id, email: user.email, role: user.role, twoFactor: Boolean(user.totpSecret) };
}

export async function currentAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: s.adminUsers.id, email: s.adminUsers.email, role: s.adminUsers.role, active: s.adminUsers.active, totp: s.adminUsers.totpSecret })
    .from(s.adminSessions)
    .innerJoin(s.adminUsers, eq(s.adminUsers.id, s.adminSessions.adminId))
    .where(and(eq(s.adminSessions.tokenHash, hashKey(token)), gt(s.adminSessions.expiresAt, new Date())));
  return row && row.active ? { id: row.id, email: row.email, role: row.role, twoFactor: Boolean(row.totp) } : null;
}

/**
 * Use at the top of every admin page and action. `allowWithout2fa` is only for the layout and
 * the Settings enrollment flow, so a required-2FA admin can still set it up.
 */
export async function requireAdmin(role?: "owner", opts: { allowWithout2fa?: boolean } = {}): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (require2fa() && !admin.twoFactor && !opts.allowWithout2fa) redirect("/admin/settings?enroll=1");
  if (role === "owner" && admin.role !== "owner") redirect("/admin?denied=1");
  return admin;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(s.adminSessions).where(eq(s.adminSessions.tokenHash, hashKey(token)));
  }
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
}

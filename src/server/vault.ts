import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * AES-256-GCM for fulfillment secrets (codes, access links). Key: FULFILLMENT_KEY (base64,
 * 32 bytes). Local development without DATABASE_URL generates a key in .data/ (git-ignored);
 * with a real database the env key is mandatory.
 */
let cached: Buffer | undefined;

function key(): Buffer {
  if (cached) return cached;
  const env = process.env.FULFILLMENT_KEY;
  if (env) {
    const k = Buffer.from(env, "base64");
    if (k.length !== 32) throw new Error("FULFILLMENT_KEY must be 32 bytes, base64-encoded.");
    return (cached = k);
  }
  if (process.env.DATABASE_URL) throw new Error("FULFILLMENT_KEY is required when DATABASE_URL is set.");
  const file = path.join(process.cwd(), ".data", "dev-fulfillment.key");
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, randomBytes(32).toString("base64"), { mode: 0o600 });
  }
  return (cached = Buffer.from(readFileSync(file, "utf8").trim(), "base64"));
}

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${body.toString("base64url")}`;
}

export function open(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unsupported ciphertext.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

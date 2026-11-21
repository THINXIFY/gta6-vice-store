import "server-only";

/** Exact decimal handling for crypto amounts (no floating point). */

export const DECIMAL_RE = /^[0-9]{1,18}(\.[0-9]{1,18})?$/;

export function parseDecimal(input: unknown, field: string): string {
  if (typeof input !== "string") throw new Error(`${field} is required.`);
  const v = input.trim().replace(/,/g, "");
  if (!DECIMAL_RE.test(v)) throw new Error(`${field} must be a number like 39.00.`);
  return v.replace(/^0+(?=\d)/, "");
}

/** Compare two decimal strings exactly: -1, 0 or 1. */
export function compareDecimal(a: string, b: string): number {
  const [ai = "0", af = ""] = a.split(".");
  const [bi = "0", bf = ""] = b.split(".");
  const scale = Math.max(af.length, bf.length);
  const x = BigInt(ai + af.padEnd(scale, "0"));
  const y = BigInt(bi + bf.padEnd(scale, "0"));
  return x === y ? 0 : x > y ? 1 : -1;
}

/** "$19.00" → 1900 cents, exactly. */
export function dollarsToCents(input: unknown): number {
  const v = parseDecimal(String(input ?? ""), "Price");
  const [i = "0", f = ""] = v.split(".");
  if (f.length > 2) throw new Error("Price can have at most 2 decimal places.");
  const cents = Number(BigInt(i) * 100n + BigInt(f.padEnd(2, "0")));
  if (cents <= 0 || cents > 100_000_00) throw new Error("Price must be between $0.01 and $100,000.");
  return cents;
}

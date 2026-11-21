import "server-only";
import { createHash } from "node:crypto";
import type { NetworkId } from "@/config/payments";

/**
 * Receiving-address checks per network: the format, plus the built-in checksum where the
 * network has one (base58check for TRON, Bitcoin and Litecoin legacy addresses; bech32/bech32m
 * for bc1/ltc1; 32-byte keys for Solana), so a mistyped address is refused before it can take a
 * payment. EVM addresses are checked for format (an EIP-55 mixed-case checksum needs keccak,
 * which Node does not ship). An admin must still confirm the address is ours and test a small
 * transfer before marking a method validated.
 */
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58 = "[1-9A-HJ-NP-Za-km-z]";
const EVM = /^0x[0-9a-fA-F]{40}$/;

const patterns: Record<NetworkId, RegExp> = {
  ethereum: EVM,
  bsc: EVM,
  polygon: EVM,
  arbitrum: EVM,
  base: EVM,
  optimism: EVM,
  tron: new RegExp(`^T${B58}{33}$`),
  solana: new RegExp(`^${B58}{32,44}$`),
  bitcoin: new RegExp(`^(bc1[02-9ac-hj-np-z]{11,71}|[13]${B58}{25,34})$`),
  litecoin: new RegExp(`^(ltc1[02-9ac-hj-np-z]{11,71}|[LM3]${B58}{26,33})$`),
};

function base58Decode(s: string): Buffer | null {
  let n = 0n;
  for (const ch of s) {
    const i = B58_ALPHABET.indexOf(ch);
    if (i < 0) return null;
    n = n * 58n + BigInt(i);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const zeros = s.length - s.replace(/^1+/, "").length;
  return Buffer.concat([Buffer.alloc(zeros), n === 0n ? Buffer.alloc(0) : Buffer.from(hex, "hex")]);
}

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest();

/** base58check: 25 bytes (version + 20-byte hash + 4-byte checksum) with a valid checksum and an allowed version. */
function base58check(s: string, versions: number[]): boolean {
  const b = base58Decode(s);
  if (!b || b.length !== 25) return false;
  const body = b.subarray(0, 21);
  return sha256(sha256(body)).subarray(0, 4).equals(b.subarray(21)) && versions.includes(body[0]!);
}

const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function polymod(values: number[]) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i]!;
  }
  return chk >>> 0;
}
/** bech32 (witness v0) or bech32m (v1+) with the expected human-readable part. */
function bech32(s: string, hrp: string): boolean {
  const lower = s.toLowerCase();
  if (s !== lower && s !== s.toUpperCase()) return false;
  const sep = lower.lastIndexOf("1");
  if (lower.slice(0, sep) !== hrp || sep + 7 > lower.length) return false;
  const data = [...lower.slice(sep + 1)].map((c) => BECH32.indexOf(c));
  if (data.some((d) => d < 0)) return false;
  const expand = [...hrp].map((c) => c.charCodeAt(0) >> 5).concat(0, [...hrp].map((c) => c.charCodeAt(0) & 31));
  const check = polymod([...expand, ...data]);
  const version = data[0]!;
  return version === 0 ? check === 1 : check === 0x2bc830a3;
}

export function isValidAddress(network: NetworkId, address: string): boolean {
  if (!patterns[network]?.test(address)) return false;
  switch (network) {
    case "tron":
      return base58check(address, [0x41]);
    case "bitcoin":
      return address.startsWith("bc1") ? bech32(address, "bc") : base58check(address, [0x00, 0x05]);
    case "litecoin":
      return address.startsWith("ltc1") ? bech32(address, "ltc") : base58check(address, [0x30, 0x32, 0x05]);
    case "solana":
      return base58Decode(address)?.length === 32;
    default:
      return true;
  }
}

/** Anything that looks like a private key or seed phrase is refused outright. */
export function looksLikeSecret(value: string): boolean {
  const words = value.trim().split(/\s+/);
  return words.length >= 12 || /^(0x)?[0-9a-fA-F]{64}$/.test(value.trim()) || /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(value.trim());
}

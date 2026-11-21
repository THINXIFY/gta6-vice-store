import "server-only";
import type { NetworkId } from "@/config/payments";

/**
 * Receiving-address format checks per network. Format only: an admin must still confirm the
 * address belongs to us (and test a small transfer) before marking a method validated.
 */
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

export function isValidAddress(network: NetworkId, address: string): boolean {
  return patterns[network]?.test(address) ?? false;
}

/** Anything that looks like a private key or seed phrase is refused outright. */
export function looksLikeSecret(value: string): boolean {
  const words = value.trim().split(/\s+/);
  return words.length >= 12 || /^(0x)?[0-9a-fA-F]{64}$/.test(value.trim()) || /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(value.trim());
}

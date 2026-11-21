import type { AssetId, NetworkId } from "@/config/payments";

/** EVM chain IDs for EIP-681 links. */
const CHAIN_IDS: Partial<Record<NetworkId, number>> = { ethereum: 1, optimism: 10, bsc: 56, polygon: 137, base: 8453, arbitrum: 42161 };
/** The network's native coin (the only asset an amount-bearing link is built for). */
const NATIVE: Record<NetworkId, AssetId> = {
  ethereum: "ETH",
  arbitrum: "ETH",
  optimism: "ETH",
  base: "ETH",
  bsc: "BNB",
  polygon: "POL",
  bitcoin: "BTC",
  litecoin: "LTC",
  solana: "SOL",
  tron: "TRX",
};

/** Decimal string → integer string with `decimals` places (exact, truncating nothing). */
function toUnits(amount: string, decimals: number): string {
  const [i = "0", f = ""] = amount.split(".");
  return BigInt(i + f.padEnd(decimals, "0").slice(0, decimals)).toString();
}

/**
 * What the payment QR encodes, per network:
 * - Bitcoin / Litecoin: BIP-21 link with the exact amount.
 * - Native ETH, BNB, POL on EVM chains: EIP-681 link with chain ID and amount in wei.
 * - Native SOL: Solana Pay link with the amount.
 * - Tokens (USDT, USDC) and TRX: the address only. Wallet support for token links varies,
 *   and a wrong token contract could lose funds, so the customer enters the amount.
 */
export function paymentUri(asset: AssetId, network: NetworkId, address: string, amount: string): { uri: string; includesAmount: boolean } {
  if (NATIVE[network] !== asset) return { uri: address, includesAmount: false };
  if (network === "bitcoin") return { uri: `bitcoin:${address}?amount=${amount}`, includesAmount: true };
  if (network === "litecoin") return { uri: `litecoin:${address}?amount=${amount}`, includesAmount: true };
  if (network === "solana") return { uri: `solana:${address}?amount=${amount}`, includesAmount: true };
  const chain = CHAIN_IDS[network];
  if (chain) return { uri: `ethereum:${address}@${chain}?value=${toUnits(amount, 18)}`, includesAmount: true };
  return { uri: address, includesAmount: false };
}

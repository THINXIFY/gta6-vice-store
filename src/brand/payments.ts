import type { AssetId, NetworkId } from "@/config/payments";

/**
 * THIS CLIENT'S STARTING PAYMENT METHODS (per-client file, see docs/white-label.md): which
 * coin/network pairs a new database offers. They are created as TEST methods with sample
 * addresses; the client enters real receiving addresses in Admin → Wallets, where methods are
 * added, switched off and validated afterwards. Never put an address here.
 */
export const startingMethods: readonly { asset: AssetId; network: NetworkId }[] = [
  { asset: "USDT", network: "bsc" },
  { asset: "USDT", network: "tron" },
  { asset: "BTC", network: "bitcoin" },
  { asset: "ETH", network: "ethereum" },
  { asset: "BNB", network: "bsc" },
];

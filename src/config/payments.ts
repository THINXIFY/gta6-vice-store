/**
 * Cryptocurrency payments (manual verification). Single source of truth for assets,
 * networks and the receiving-wallet slots.
 *
 * Production rule: a method is offered only when `validated: true` AND a receiving
 * address is set (ultimately served per order by the backend, managed in admin).
 * Preview builds (NEXT_PUBLIC_CONTENT_PREVIEW=1) use obviously fake sample addresses and
 * preview rates instead; nothing in preview is payable.
 */

export type NetworkId = "tron" | "ethereum" | "bsc" | "solana" | "polygon" | "arbitrum" | "base" | "optimism" | "bitcoin" | "litecoin";
export type TxFamily = "evm" | "hex64" | "solana";

export type Network = {
  id: NetworkId;
  name: string;
  /** Token standard shown next to the name, e.g. "TRC20". */
  standard?: string;
  family: TxFamily;
  /** Confirmations an admin should wait for before approving. */
  confirmations: number;
  /** Transaction explorer, `{tx}` is replaced. */
  explorer: string;
  /** Address explorer, `{addr}` is replaced (to check incoming transfers). */
  addressExplorer: string;
};

export const networks: Record<NetworkId, Network> = {
  tron: { id: "tron", name: "Tron", standard: "TRC20", family: "hex64", confirmations: 20, explorer: "https://tronscan.org/#/transaction/{tx}", addressExplorer: "https://tronscan.org/#/address/{addr}" },
  ethereum: { id: "ethereum", name: "Ethereum", standard: "ERC20", family: "evm", confirmations: 12, explorer: "https://etherscan.io/tx/{tx}", addressExplorer: "https://etherscan.io/address/{addr}" },
  bsc: { id: "bsc", name: "BNB Smart Chain", standard: "BEP20", family: "evm", confirmations: 15, explorer: "https://bscscan.com/tx/{tx}", addressExplorer: "https://bscscan.com/address/{addr}" },
  solana: { id: "solana", name: "Solana", standard: "SPL", family: "solana", confirmations: 32, explorer: "https://solscan.io/tx/{tx}", addressExplorer: "https://solscan.io/account/{addr}" },
  polygon: { id: "polygon", name: "Polygon", family: "evm", confirmations: 128, explorer: "https://polygonscan.com/tx/{tx}", addressExplorer: "https://polygonscan.com/address/{addr}" },
  arbitrum: { id: "arbitrum", name: "Arbitrum One", family: "evm", confirmations: 12, explorer: "https://arbiscan.io/tx/{tx}", addressExplorer: "https://arbiscan.io/address/{addr}" },
  base: { id: "base", name: "Base", family: "evm", confirmations: 12, explorer: "https://basescan.org/tx/{tx}", addressExplorer: "https://basescan.org/address/{addr}" },
  optimism: { id: "optimism", name: "Optimism", family: "evm", confirmations: 12, explorer: "https://optimistic.etherscan.io/tx/{tx}", addressExplorer: "https://optimistic.etherscan.io/address/{addr}" },
  bitcoin: { id: "bitcoin", name: "Bitcoin", family: "hex64", confirmations: 2, explorer: "https://mempool.space/tx/{tx}", addressExplorer: "https://mempool.space/address/{addr}" },
  litecoin: { id: "litecoin", name: "Litecoin", family: "hex64", confirmations: 6, explorer: "https://litecoinspace.org/tx/{tx}", addressExplorer: "https://litecoinspace.org/address/{addr}" },
};

export const txPatterns: Record<TxFamily, RegExp> = {
  evm: /^0x[0-9a-fA-F]{64}$/,
  hex64: /^[0-9a-fA-F]{64}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{80,90}$/,
};

export type AssetId = "USDT" | "USDC" | "BTC" | "ETH" | "BNB" | "SOL" | "TRX" | "LTC" | "POL";

export type AssetNetwork = { network: NetworkId; validated: boolean; address: string };

export type Asset = {
  id: AssetId;
  name: string;
  /** Decimals shown to the customer (amounts round up, never down). */
  decimals: number;
  stable: boolean;
  /** Shown first; others sit under "More payment options". */
  primary: boolean;
  networks: AssetNetwork[];
};

const slot = (network: NetworkId): AssetNetwork => ({ network, validated: false, address: "" });

export const assets: Asset[] = [
  { id: "USDT", name: "Tether", decimals: 2, stable: true, primary: true, networks: (["tron", "ethereum", "bsc", "solana", "polygon", "arbitrum"] as const).map(slot) },
  { id: "BTC", name: "Bitcoin", decimals: 8, stable: false, primary: true, networks: [slot("bitcoin")] },
  { id: "ETH", name: "Ether", decimals: 6, stable: false, primary: true, networks: (["ethereum", "arbitrum", "optimism", "base"] as const).map(slot) },
  { id: "BNB", name: "BNB", decimals: 6, stable: false, primary: true, networks: [slot("bsc")] },
  { id: "USDC", name: "USD Coin", decimals: 2, stable: true, primary: true, networks: (["ethereum", "solana", "polygon", "base", "arbitrum"] as const).map(slot) },
  { id: "SOL", name: "Solana", decimals: 4, stable: false, primary: false, networks: [slot("solana")] },
  { id: "TRX", name: "TRON", decimals: 2, stable: false, primary: false, networks: [slot("tron")] },
  { id: "LTC", name: "Litecoin", decimals: 8, stable: false, primary: false, networks: [slot("litecoin")] },
  { id: "POL", name: "Polygon", decimals: 4, stable: false, primary: false, networks: [slot("polygon")] },
];

/**
 * PREVIEW ONLY: indicative USD rates for laying out amounts. Not live quotes. A real
 * checkout must take a server-side quote with an expiry when the order is created.
 */
export const previewUsdRates: Record<AssetId, number> = {
  USDT: 1, USDC: 1, BTC: 95000, ETH: 3400, BNB: 650, SOL: 180, TRX: 0.25, LTC: 95, POL: 0.45,
};

/** How long a quoted amount stays valid. */
export const quoteMinutes = 30;
/** Target manual processing time after submission (a target, not a promise). */
export const targetProcessingMinutes = 30;

/** Console account regions the customer can pick. Compatibility stays unconfirmed until codes are sourced. */
export const accountRegions = [
  { id: "us", label: "United States" },
  { id: "eu", label: "Europe" },
  { id: "uk", label: "United Kingdom" },
  { id: "other", label: "Another region" },
] as const;
export const regionCompatibilityConfirmed = false;

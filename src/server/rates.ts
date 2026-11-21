import "server-only";
import { assets, previewUsdRates, type AssetId } from "@/config/payments";

/**
 * USD exchange rates for quotes, fetched server-side only (the browser never supplies a rate).
 * Primary: CoinGecko simple price. Fallback: Coinbase exchange rates. Results are cached for
 * a minute; a rate older than MAX_AGE, non-positive, or a stablecoin off its peg by more than
 * 3% is refused, so no quote is made from bad data.
 *
 * RATES_MODE=fixed uses the indicative preview rates (tests and offline development); such
 * quotes are flagged `preview` and can never be live.
 */

export type Rate = { usd: number; source: string; fetchedAt: number; fixed: boolean };

const CACHE_MS = 60_000;
const MAX_AGE_MS = 5 * 60_000;
const TIMEOUT_MS = 4_000;

const COINGECKO_IDS: Record<AssetId, string> = {
  USDT: "tether",
  USDC: "usd-coin",
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  TRX: "tron",
  LTC: "litecoin",
  POL: "polygon-ecosystem-token",
};

let cache: { at: number; rates: Partial<Record<AssetId, Rate>> } | null = null;
let inflight: Promise<Partial<Record<AssetId, Rate>>> | null = null;

export const fixedRates = () => process.env.RATES_MODE === "fixed";

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return res.json();
}

async function fromCoinGecko(): Promise<Partial<Record<AssetId, number>>> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const data = (await getJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)) as Record<string, { usd?: number }>;
  const out: Partial<Record<AssetId, number>> = {};
  for (const [asset, id] of Object.entries(COINGECKO_IDS) as [AssetId, string][]) {
    const usd = data[id]?.usd;
    if (typeof usd === "number") out[asset] = usd;
  }
  return out;
}

async function fromCoinbase(): Promise<Partial<Record<AssetId, number>>> {
  const data = (await getJson("https://api.coinbase.com/v2/exchange-rates?currency=USD")) as { data?: { rates?: Record<string, string> } };
  const out: Partial<Record<AssetId, number>> = {};
  for (const a of assets) {
    const perUsd = Number(data.data?.rates?.[a.id]);
    if (perUsd > 0) out[a.id] = 1 / perUsd;
  }
  return out;
}

function sane(asset: AssetId, usd: number | undefined): usd is number {
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) return false;
  const stable = assets.find((a) => a.id === asset)?.stable;
  return !stable || Math.abs(usd - 1) <= 0.03;
}

async function refresh(): Promise<Partial<Record<AssetId, Rate>>> {
  const rates: Partial<Record<AssetId, Rate>> = {};
  const sources: [string, () => Promise<Partial<Record<AssetId, number>>>][] = [
    ["coingecko", fromCoinGecko],
    ["coinbase", fromCoinbase],
  ];
  for (const [source, load] of sources) {
    if (assets.every((a) => rates[a.id])) break;
    try {
      const got = await load();
      for (const a of assets) if (!rates[a.id] && sane(a.id, got[a.id])) rates[a.id] = { usd: got[a.id]!, source, fetchedAt: Date.now(), fixed: false };
    } catch (err) {
      console.warn(`[rates] ${source} unavailable:`, (err as Error).message);
    }
  }
  return rates;
}

/** All available rates (cached). Assets without a trustworthy rate are simply absent. */
export async function getRates(): Promise<Partial<Record<AssetId, Rate>>> {
  if (fixedRates()) {
    return Object.fromEntries(assets.map((a) => [a.id, { usd: previewUsdRates[a.id], source: "fixed", fetchedAt: Date.now(), fixed: true }]));
  }
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rates;
  inflight ??= refresh()
    .then((rates) => {
      // Keep still-fresh previous rates for any asset this round could not fetch.
      const merged = { ...rates };
      for (const a of assets) {
        const old = cache?.rates[a.id];
        if (!merged[a.id] && old && Date.now() - old.fetchedAt < MAX_AGE_MS) merged[a.id] = old;
      }
      cache = { at: Date.now(), rates: merged };
      return merged;
    })
    .finally(() => (inflight = null));
  return inflight;
}

/** A rate fresh enough to lock into a 30-minute quote, or null. */
export async function rateFor(asset: AssetId): Promise<Rate | null> {
  const rate = (await getRates())[asset];
  return rate && Date.now() - rate.fetchedAt < MAX_AGE_MS ? rate : null;
}

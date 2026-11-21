import { assets, previewUsdRates, quoteMinutes, type AssetId, type NetworkId } from "@/config/payments";
import type { Quote } from "./types";

const RATE_SCALE = 8;

/** Positive decimal string → integer scaled by 10^scale (truncating extra digits). */
function scaled(decimal: string, scale: number): bigint {
  const [i = "0", f = ""] = decimal.split(".");
  return BigInt(i + f.slice(0, scale).padEnd(scale, "0"));
}

/** A USD rate as a fixed 8-decimal string (exact input for the BigInt maths below). */
export function rateString(usdPerUnit: number): string {
  if (!Number.isFinite(usdPerUnit) || usdPerUnit <= 0) throw new Error("Invalid rate.");
  return usdPerUnit.toFixed(RATE_SCALE);
}

/**
 * Exact crypto amount for a USD price: ceil(usd / rate) at the asset's decimals, computed
 * with integers only. Rounds UP so the customer never underpays because of rounding.
 */
export function cryptoAmount(usdCents: number, rate: string, decimals: number): string {
  const r = scaled(rate, RATE_SCALE);
  if (r <= 0n) throw new Error("Invalid rate.");
  const numerator = BigInt(usdCents) * 10n ** BigInt(decimals + RATE_SCALE);
  const denominator = 100n * r;
  const units = (numerator + denominator - 1n) / denominator;
  const s = units.toString().padStart(decimals + 1, "0");
  return decimals ? `${s.slice(0, -decimals)}.${s.slice(-decimals)}` : s;
}

/** Amount in the asset for a USD price at a given (or the preview) rate. */
export function quoteAmount(usdCents: number, asset: AssetId, usdRate = previewUsdRates[asset]): { amount: string; rate: number } {
  const def = assets.find((a) => a.id === asset)!;
  return { amount: cryptoAmount(usdCents, rateString(usdRate), def.decimals), rate: usdRate };
}

/** PREVIEW quote with fixed indicative rates (tests / offline development). */
export function previewQuote(usdCents: number, asset: AssetId, network: NetworkId, now = new Date()): Quote {
  const { amount, rate } = quoteAmount(usdCents, asset);
  return { asset, network, amount, usdCents, rate, preview: true, expiresAt: new Date(now.getTime() + quoteMinutes * 60_000).toISOString() };
}

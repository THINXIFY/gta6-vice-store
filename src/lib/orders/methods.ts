import { assets, networks, type Asset, type AssetId, type NetworkId } from "@/config/payments";
import { checkoutIsPreview } from "@/lib/checkout";

/** An asset/network pair the customer may choose. */
export type Method = { asset: Asset; network: NetworkId };

/**
 * Production: only validated pairs with a configured address.
 * Preview: every configured pair, with an obviously fake sample address.
 */
function usable(asset: Asset, network: NetworkId): boolean {
  const slot = asset.networks.find((n) => n.network === network);
  if (!slot) return false;
  return (slot.validated && Boolean(slot.address)) || checkoutIsPreview;
}

export function offeredAssets(): Asset[] {
  return assets
    .map((a) => ({ ...a, networks: a.networks.filter((n) => usable(a, n.network)) }))
    .filter((a) => a.networks.length > 0);
}

/** Receiving address for an order. Real addresses must come from the backend per order. */
export function receivingAddress(asset: AssetId, network: NetworkId): string {
  const slot = assets.find((a) => a.id === asset)?.networks.find((n) => n.network === network);
  if (slot?.validated && slot.address) return slot.address;
  return `PREVIEW-${networks[network].name.replace(/\s+/g, "").toUpperCase()}-${asset}-NOT-A-REAL-ADDRESS`;
}

export function networkLabel(network: NetworkId): string {
  const n = networks[network];
  return n.standard && n.standard !== "SPL" ? `${n.name} (${n.standard})` : n.name;
}

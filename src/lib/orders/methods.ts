import { assets, methodRank, networks, type Asset, type AssetId, type NetworkId } from "@/config/payments";

/** An asset/network pair the store offers (from Admin → Wallets, via the catalogue). */
export type OfferedMethod = { asset: AssetId; network: NetworkId };

/** Offered methods grouped by coin, in display order (coins with no offered network are left out). */
export function offeredAssets(methods: OfferedMethod[]): Asset[] {
  const sorted = [...methods].sort((a, b) => methodRank(a.asset, a.network) - methodRank(b.asset, b.network));
  return assets
    .map((a) => ({ ...a, networks: sorted.filter((m) => m.asset === a.id).map((m) => ({ network: m.network })) }))
    .filter((a) => a.networks.length > 0);
}

/** Obviously fake address for test payment methods (never payable). */
export function sampleAddress(asset: AssetId, network: NetworkId): string {
  return `PREVIEW-${networks[network].name.replace(/\s+/g, "").toUpperCase()}-${asset}-NOT-A-REAL-ADDRESS`;
}

export function networkLabel(network: NetworkId): string {
  const n = networks[network];
  return n.standard && n.standard !== "SPL" ? `${n.name} (${n.standard})` : n.name;
}

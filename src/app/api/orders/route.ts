import { accountRegions, assets, networks, type AssetId, type NetworkId } from "@/config/payments";
import { post } from "@/server/http";
import { catalogue, createOrder } from "@/server/orders";
import { email, oneOf } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create an order. Price, amount, address and Payment ID are all decided server-side. */
export const POST = post("create", { max: 10, windowMs: 60_000 }, (b, ctx) =>
  createOrder(
    {
      edition: oneOf(b.edition, catalogue.editions, "Edition"),
      platform: oneOf(b.platform, catalogue.platforms, "Platform"),
      email: email(b.email),
      region: oneOf(b.region, accountRegions.map((r) => r.id), "Region"),
      asset: oneOf<AssetId>(b.asset, assets.map((a) => a.id), "Cryptocurrency"),
      network: oneOf<NetworkId>(b.network, Object.keys(networks) as NetworkId[], "Network"),
    },
    ctx.ipHash,
  ),
);

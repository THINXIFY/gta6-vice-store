import { optionalKey, post } from "@/server/http";
import { viewOrder } from "@/server/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full order (payment page). Requires the order's access key. */
export const POST = post("view", { max: 60, windowMs: 60_000 }, async (b) => ({ order: await viewOrder(b.paymentId, optionalKey(b.key)) }));

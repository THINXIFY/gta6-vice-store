import { optionalKey, post } from "@/server/http";
import { lookupOrder } from "@/server/orders";
import { email } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status by Payment ID + email (progress only); access key unlocks sensitive details. */
export const POST = post("status", { max: 20, windowMs: 60_000 }, async (b) => ({ order: await lookupOrder(b.paymentId, email(b.email), optionalKey(b.key)) }));

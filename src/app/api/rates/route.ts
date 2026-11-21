import { json } from "@/server/http";
import { getRates } from "@/server/rates";
import { clientIp, rateLimit } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Indicative USD rates for the checkout estimate only. The amount a customer pays is always
 * calculated and locked server-side when the order is created.
 */
export async function GET(req: Request) {
  const rl = await rateLimit(`rates:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return json({ error: "Too many requests." }, 429, { "Retry-After": String(rl.retryAfter) });
  const rates = await getRates();
  return json({ rates: Object.fromEntries(Object.entries(rates).map(([k, r]) => [k, r.usd])) });
}

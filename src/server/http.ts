import "server-only";
import { Conflict, NotFound } from "./orders";
import { clientIp, InputError, ipHash, jsonBody, rateLimit } from "./security";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers, ...extra } });

/**
 * POST handler wrapper: same-origin check, per-IP rate limit, JSON parsing, and error mapping
 * that never leaks internals.
 */
export function post(
  name: string,
  limit: { max: number; windowMs: number },
  fn: (body: Record<string, unknown>, ctx: { ip: string; ipHash: string }) => Promise<unknown>,
) {
  return async (req: Request) => {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) return json({ error: "Forbidden" }, 403);

    const ip = clientIp(req);
    const rl = await rateLimit(`${name}:${ip}`, limit.max, limit.windowMs);
    if (!rl.ok) return json({ error: "Too many requests. Please wait a moment and try again." }, 429, { "Retry-After": String(rl.retryAfter) });

    try {
      const body = await jsonBody(req);
      return json(await fn(body, { ip, ipHash: ipHash(ip) }));
    } catch (err) {
      if (err instanceof InputError) return json({ error: err.message }, 400);
      if (err instanceof NotFound) return json({ error: err.message }, 404);
      if (err instanceof Conflict) return json({ error: err.message }, 409);
      console.error(`[api:${name}]`, err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}

export const optionalKey = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : undefined);

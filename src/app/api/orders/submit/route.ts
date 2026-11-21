import { json } from "@/server/http";
import { parseDecimal } from "@/server/money";
import { Conflict, NotFound, submitPayment } from "@/server/orders";
import { clientIp, email, InputError, ipHash, rateLimit, str } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE = 5 * 1024 * 1024;

/** Identify the image from its bytes (magic numbers), never from the filename or declared type. */
function sniffImage(b: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Customer proof of payment (multipart/form-data): paymentId, email, txid, claimedAmount,
 * screenshot (PNG/JPG/WebP ≤ 5 MB) and an optional message. All but the message are required. Moves the order to
 * payment_submitted only; never confirms a payment.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return json({ error: "Forbidden" }, 403);
  const ip = clientIp(req);
  const rl = await rateLimit(`submit:${ip}`, 10, 60_000);
  if (!rl.ok) return json({ error: "Too many requests. Please wait a moment and try again." }, 429, { "Retry-After": String(rl.retryAfter) });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_FILE + 64 * 1024) return json({ error: "The screenshot must be 5 MB or smaller." }, 413);

  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new InputError("Invalid request.");
    }
    const field = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : undefined;
    };

    let claimedAmount: string;
    try {
      claimedAmount = parseDecimal(field("claimedAmount"), "Amount sent");
    } catch (e) {
      throw new InputError((e as Error).message);
    }
    const message = field("message")?.trim() ?? "";
    if (message.length > 1000) throw new InputError("Your message must be 1,000 characters or fewer.");

    // Required: a payment screenshot (supporting evidence only; never proof on its own).
    const file = form.get("screenshot");
    if (!file || typeof file === "string" || file.size === 0) throw new InputError("Add a screenshot of the payment.");
    let screenshot: { mime: string; data: Buffer };
    {
      if (file.size > MAX_FILE) throw new InputError("The screenshot must be 5 MB or smaller.");
      const data = Buffer.from(await file.arrayBuffer());
      const mime = sniffImage(data);
      if (!mime) throw new InputError("The screenshot must be a PNG, JPG or WebP image.");
      screenshot = { mime, data };
    }

    const key = field("key");
    const order = await submitPayment(
      field("paymentId"),
      email(field("email")),
      { txid: str(field("txid"), "Transaction hash", 120), claimedAmount, message, screenshot },
      key && key.length <= 64 ? key : undefined,
      ipHash(ip),
    );
    return json({ order });
  } catch (err) {
    if (err instanceof InputError) return json({ error: err.message }, 400);
    if (err instanceof NotFound) return json({ error: err.message }, 404);
    if (err instanceof Conflict) return json({ error: err.message }, 409);
    console.error("[api:submit]", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

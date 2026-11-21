import { post } from "@/server/http";
import { createSupportMessage } from "@/server/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Contact form. Same-origin only, 5 messages per IP per hour. */
export const POST = post("support", { max: 5, windowMs: 60 * 60_000 }, (body, ctx) => createSupportMessage(body, ctx.ipHash));

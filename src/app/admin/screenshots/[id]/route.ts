import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { currentAdmin, require2fa, requestIpHash } from "@/server/auth";
import { getDb } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Private screenshot delivery: admins only, never cached, served as an inert image. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const admin = await currentAdmin();
  if (!admin || (require2fa() && !admin.twoFactor)) return notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return notFound();

  const db = await getDb();
  const [shot] = await db.select().from(s.paymentScreenshots).where(eq(s.paymentScreenshots.id, id));
  if (!shot) return notFound();
  if (shot.purgedAt) return new Response("Deleted under the screenshot retention policy", { status: 410, headers: { "Cache-Control": "no-store" } });
  await db.insert(s.auditLogs).values({ actor: `admin:${admin.email}`, action: "screenshot.view", entity: "order", entityId: shot.orderId, data: { screenshotId: id }, ipHash: await requestIpHash() });

  return new Response(new Uint8Array(shot.data), {
    headers: {
      "Content-Type": shot.mime,
      "Content-Length": String(shot.bytes),
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

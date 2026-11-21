import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check for hosting platforms and uptime monitors: 200 when the app can reach its
 * database, 503 otherwise. Reveals nothing beyond up/down.
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}

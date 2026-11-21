import { editionName, platformName } from "@/lib/catalog";
import { getCatalog } from "@/server/catalog";
import { exportOrders } from "@/server/admin";
import { currentAdmin, require2fa, requestIpHash } from "@/server/auth";
import { rateLimit } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Spreadsheet-safe cell: quoted, and formula-like values neutralised (CSV injection). */
function cell(v: unknown): string {
  let t = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

/** Orders CSV: owners only, rate limited, audited, never cached. Same filters as the list. */
export async function GET(req: Request) {
  const admin = await currentAdmin();
  const deny = (status: number, msg: string) => new Response(msg, { status, headers: { "Cache-Control": "no-store" } });
  if (!admin || (require2fa() && !admin.twoFactor)) return deny(404, "Not found");
  if (admin.role !== "owner") return deny(403, "Only owners can export orders.");
  if (!(await rateLimit(`admin-export:${admin.id}`, 10, 10 * 60_000)).ok) return deny(429, "Too many exports. Try again in a few minutes.");

  const p = new URL(req.url).searchParams;
  const get = (k: string) => p.get(k)?.slice(0, 120) || undefined;
  const catalog = await getCatalog();
  const rows = await exportOrders(admin, { q: get("q"), status: get("status"), dataset: get("dataset"), asset: get("asset"), sort: get("sort") }, await requestIpHash());

  const head = ["Payment ID", "Reference", "Data", "Status", "Created (UTC)", "Customer email", "Region", "Edition", "Platform", "Price (USD)", "Asset", "Network", "Expected amount", "Reported amount", "Verified amount", "TXID", "Submitted (UTC)", "Game released"];
  const lines = rows.map((r) =>
    [
      r.paymentId,
      r.reference,
      r.isTest ? "test" : "live",
      r.status,
      r.createdAt,
      r.email,
      r.region,
      editionName(catalog, r.editionId),
      platformName(catalog, r.platformId),
      (r.usdCents / 100).toFixed(2),
      r.asset,
      r.network,
      r.cryptoAmount,
      r.claimed,
      r.verifiedAmount,
      r.txid,
      r.submittedAt ? new Date(r.submittedAt) : null,
      r.released ? "yes" : "no",
    ]
      .map(cell)
      .join(","),
  );
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response("﻿" + [head.map(cell).join(","), ...lines].join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vice-orders-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { ChevronRight, Download, SearchX } from "lucide-react";
import Link from "next/link";
import { ago, EmptyState, input, PageHeader, Pagination, select, StatusBadge, TestPill, usd, when } from "@/components/admin/ui";
import { assets, networks, type NetworkId } from "@/config/payments";
import { editionName as nameOfEdition, platformName as nameOfPlatform, platformShortName } from "@/lib/catalog";
import { getCatalog } from "@/server/catalog";
import { networkLabel } from "@/lib/orders/methods";
import { statusInfo, type OrderStatus } from "@/lib/orders/types";
import { listOrders, ORDER_SORTS, ORDERS_PER_PAGE } from "@/server/admin";
import { requireAdmin } from "@/server/auth";

export const metadata = { title: "Orders & Payments" };

const TABS = [
  { id: "", label: "All" },
  { id: "review", label: "To review" },
  { id: "info_required", label: "Info requested" },
  { id: "payment_verified", label: "Awaiting release" },
  { id: "approved", label: "Approved" },
  { id: "payment_rejected", label: "Rejected" },
];
const MORE_STATUSES: OrderStatus[] = ["awaiting_payment", "under_review", "game_ready", "order_expired"];

type Search = Promise<{ q?: string; status?: string; dataset?: string; asset?: string; sort?: string; page?: string }>;


export default async function Orders({ searchParams }: { searchParams: Search }) {
  const catalog = await getCatalog();
  const editionName = (id: string) => nameOfEdition(catalog, id).replace(" Edition", "");
  const platformName = (id: string) => nameOfPlatform(catalog, id);
  const platformShort = (id: string) => platformShortName(catalog, id);
  /** "TRC20", "Bitcoin": the short network name for dense rows. */
  const netShort = (n: string) => networks[n as NetworkId]?.standard ?? networks[n as NetworkId]?.name ?? n;
  const me = await requireAdmin(); // never rely on the layout alone for auth
  const sp = await searchParams;
  const filter = { q: sp.q, status: sp.status, dataset: sp.dataset, asset: sp.asset, sort: sp.sort, page: Math.max(1, Number(sp.page) || 1) };
  const { rows, total, page, pages } = await listOrders(filter);
  const qs = (p: Record<string, string | number | undefined>) =>
    "?" +
    new URLSearchParams(
      Object.entries({ q: sp.q, status: sp.status, dataset: sp.dataset, asset: sp.asset, sort: sp.sort, ...p })
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ).toString();
  const filtered = Boolean(sp.q || sp.status || sp.dataset || sp.asset);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Orders & Payments"
        description="Payments to review come first. Verify every transaction on the blockchain before approving."
        actions={
          me.role === "owner" && total > 0 ? (
            <a
              href={`/admin/orders/export${qs({ page: undefined })}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-panel-2 px-3.5 text-sm font-semibold transition-colors hover:border-lavender/35"
            >
              <Download aria-hidden className="size-4" />
              Export CSV
            </a>
          ) : undefined
        }
      />

      <nav aria-label="Filter by status" className="-mb-1 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {TABS.map((t) => {
          const active = (sp.status ?? "") === t.id;
          return (
            <Link
              key={t.id}
              href={qs({ status: t.id || undefined, page: undefined })}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${active ? "border-vice text-warm" : "border-transparent text-warm/55 hover:text-warm"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <form className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1fr)_10rem_9rem_9rem_9.5rem_auto]" role="search">
        <label className="col-span-2 lg:col-span-1">
          <span className="sr-only">Search orders</span>
          <input name="q" defaultValue={sp.q} placeholder="Payment ID, order reference, email or TXID" className={input} />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={sp.status ?? ""} className={select}>
            <option value="">Any status</option>
            <option value="review">To review</option>
            <option value="pending">Pending (incl. info requested)</option>
            <option value="approved">Approved</option>
            {[...TABS.slice(2).map((t) => t.id), ...MORE_STATUSES]
              .filter((id, i, a) => id !== "approved" && a.indexOf(id) === i)
              .map((id) => (
                <option key={id} value={id}>
                  {statusInfo[id as OrderStatus].label}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Data set</span>
          <select name="dataset" defaultValue={sp.dataset ?? ""} className={select}>
            <option value="">Live and test</option>
            <option value="live">Live only</option>
            <option value="test">Test only</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Cryptocurrency</span>
          <select name="asset" defaultValue={sp.asset ?? ""} className={select}>
            <option value="">Any coin</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort</span>
          <select name="sort" defaultValue={sp.sort ?? "priority"} className={select}>
            {Object.entries(ORDER_SORTS).map(([id, l]) => (
              <option key={id} value={id}>
                Sort: {l}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button className="h-10 flex-1 rounded-lg bg-warm px-4 text-sm font-semibold text-obsidian transition-colors hover:bg-white">Apply</button>
          {filtered && (
            <Link href="/admin/orders" className="grid h-10 place-items-center rounded-lg px-3 text-sm text-warm/60 hover:bg-panel-2 hover:text-warm">
              Clear
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel">
          <EmptyState icon={SearchX} title={filtered ? "No orders match these filters" : "No orders yet"}>
            {filtered ? "Try another search term or clear the filters." : "Orders appear here as soon as a customer starts checkout."}
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Desktop and tablet: one line of facts per order; the full record is one click away. */}
          <div className="overflow-x-auto rounded-2xl border border-line bg-panel max-md:hidden">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="text-left text-xs text-warm/50">
                <tr className="border-b border-line bg-panel-2/70">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Payment check</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Created</th>
                  <th className="w-10 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const mismatch = r.claimed && r.claimed !== r.cryptoAmount;
                  return (
                    <tr key={r.paymentId} className="group border-t border-line/70 first:border-0 hover:bg-panel-2/60">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/admin/orders/${r.paymentId}`} className="font-mono text-[0.8125rem] font-medium text-sunset hover:underline">
                          {r.paymentId}
                        </Link>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-warm/40">
                          <span className="font-mono">{r.reference}</span> {r.isTest && <TestPill />}
                        </span>
                      </td>
                      <td className="max-w-[15rem] px-3 py-3">
                        <span className="block truncate text-warm/85" title={r.email}>
                          {r.email}
                        </span>
                        <span className="text-xs text-warm/40 uppercase">{r.region}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {editionName(r.editionId)}
                        <span className="block text-xs text-warm/45" title={platformName(r.platformId)}>
                          {platformShort(r.platformId)}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="tabular-nums">{usd(r.usdCents)}</span>
                        <span className="block font-mono text-xs text-warm/50" title={networkLabel(r.network as NetworkId)}>
                          {r.cryptoAmount} {r.asset} · {netShort(r.network)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {r.verifiedAmount ? (
                          <span className="text-success-soft">Verified {r.verifiedAmount}</span>
                        ) : r.claimed ? (
                          <span className={mismatch ? "font-semibold text-sunset" : "text-warm/70"}>
                            Reported {r.claimed}
                            <span className="block font-normal text-warm/45">{mismatch ? "Differs from expected" : "Matches expected"}</span>
                          </span>
                        ) : (
                          <span className="text-warm/35">Not paid yet</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} />
                        {r.released && <span className="mt-1 block text-xs text-warm/45">Game released</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs whitespace-nowrap text-warm/55" title={`Created ${when(r.createdAt)}${r.submittedAt ? `, paid ${when(r.submittedAt)}` : ""}`}>
                        {ago(r.createdAt)}
                        {r.submittedAt && <span className="block text-warm/40">paid {ago(r.submittedAt)}</span>}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <span aria-hidden className="inline-grid size-7 place-items-center rounded-md text-warm/30 transition-colors group-hover:bg-panel-2 group-hover:text-warm">
                          <ChevronRight className="size-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phones: stacked list. */}
          <ul className="grid gap-2 md:hidden">
            {rows.map((r) => (
              <li key={r.paymentId}>
                <Link href={`/admin/orders/${r.paymentId}`} className="grid gap-2 rounded-xl border border-line bg-panel p-4 transition-colors active:bg-panel-2">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.8125rem] font-medium text-sunset">{r.paymentId}</span>
                    <StatusBadge status={r.status} />
                  </span>
                  <span className="truncate text-sm text-warm/80">{r.email}</span>
                  <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-warm/50">
                    <span>
                      {editionName(r.editionId)} · {platformShort(r.platformId)} · {usd(r.usdCents)}
                    </span>
                    <span className="font-mono">
                      {r.claimed ?? r.cryptoAmount} {r.asset}
                    </span>
                  </span>
                  {r.isTest && (
                    <span className="justify-self-start">
                      <TestPill />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Pagination page={page} pages={pages} total={total} perPage={ORDERS_PER_PAGE} href={(p) => qs({ page: p > 1 ? p : undefined })} />
    </div>
  );
}

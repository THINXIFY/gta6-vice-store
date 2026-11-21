import { Download, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState, input, PageHeader, Pagination, select, StatusBadge, TestPill, usd, when } from "@/components/admin/ui";
import { assets, type NetworkId } from "@/config/payments";
import { editions, platforms } from "@/config/product";
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

const editionName = (id: string) => editions.find((e) => e.id === id)?.name.replace(" Edition", "") ?? id;
const platformName = (id: string) => platforms.find((p) => p.id === id)?.name ?? id;

export default async function Orders({ searchParams }: { searchParams: Search }) {
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
          {/* Desktop and tablet: dense table. */}
          <div className="overflow-x-auto rounded-2xl border border-line bg-panel max-md:hidden">
            <table className="w-full min-w-[68rem] text-sm">
              <thead className="text-left text-xs text-warm/50">
                <tr className="border-b border-line bg-panel-2">
                  <th className="px-4 py-3 font-medium">Payment ID</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Expected</th>
                  <th className="px-3 py-3 font-medium">Reported</th>
                  <th className="px-3 py-3 font-medium">Verified</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const mismatch = r.claimed && r.claimed !== r.cryptoAmount;
                  return (
                    <tr key={r.paymentId} className="border-t border-line/70 align-top first:border-0 hover:bg-panel-2">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${r.paymentId}`} className="font-mono text-[0.8125rem] font-medium text-sunset hover:underline">
                          {r.paymentId}
                        </Link>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-warm/40">
                          {r.reference} {r.isTest && <TestPill />}
                        </span>
                      </td>
                      <td className="max-w-[14rem] px-3 py-3">
                        <span className="block truncate text-warm/85">{r.email}</span>
                        <span className="text-xs text-warm/40 uppercase">{r.region}</span>
                      </td>
                      <td className="px-3 py-3">
                        {editionName(r.editionId)}
                        <span className="block text-xs text-warm/45">{platformName(r.platformId)}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{usd(r.usdCents)}</td>
                      <td className="px-3 py-3 font-mono text-[0.8125rem]">
                        {r.cryptoAmount} {r.asset}
                        <span className="block font-sans text-xs text-warm/45">{networkLabel(r.network as NetworkId)}</span>
                      </td>
                      <td className={`px-3 py-3 font-mono text-[0.8125rem] ${mismatch ? "text-sunset" : ""}`}>
                        {r.claimed ?? <span className="text-warm/30">—</span>}
                        {mismatch && <span className="block font-sans text-xs">Differs</span>}
                      </td>
                      <td className="px-3 py-3 font-mono text-[0.8125rem] text-[#9ef0c4]">{r.verifiedAmount ?? <span className="text-warm/30">—</span>}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} />
                        {r.released && <span className="mt-1 block text-xs text-warm/45">Game released</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs whitespace-nowrap text-warm/55">
                        {when(r.createdAt)}
                        {r.submittedAt && <span className="block text-warm/40">Paid {when(r.submittedAt)}</span>}
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
                      {editionName(r.editionId)} · {platformName(r.platformId)} · {usd(r.usdCents)}
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

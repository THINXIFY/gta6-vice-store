import { Activity, ArrowRight, CheckCircle2, Inbox, PackageCheck } from "lucide-react";
import Link from "next/link";
import { age, EmptyState, Flash, PageHeader, Segmented, StatStrip, StatusBadge, usd, when } from "@/components/admin/ui";
import { networkLabel } from "@/lib/orders/methods";
import type { NetworkId } from "@/config/payments";
import { checkoutOpen } from "@/lib/checkout";
import { statusInfo } from "@/lib/orders/types";
import { overview, type Dataset } from "@/server/admin";
import { requireAdmin } from "@/server/auth";

export const metadata = { title: "Overview" };

export default async function Overview({ searchParams }: { searchParams: Promise<{ denied?: string; data?: string }> }) {
  await requireAdmin(); // never rely on the layout alone for auth
  const sp = await searchParams;
  // Live and test figures are never mixed. While checkout is closed every order is a test.
  const dataset: Dataset = sp.data === "live" || sp.data === "test" ? sp.data : checkoutOpen ? "live" : "test";
  const { counts: c, split, inventory, queue, activity } = await overview(dataset);
  const scope = `&dataset=${dataset}`;

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Overview"
        description={dataset === "test" ? "Test orders from development and previews. No real payments." : "Live orders and verified revenue."}
        actions={
          <Segmented
            label="Data set"
            options={[
              { href: "/admin?data=live", label: `Live (${split.live})`, active: dataset === "live" },
              { href: "/admin?data=test", label: `Test (${split.test})`, active: dataset === "test" },
            ]}
          />
        }
      />
      {sp.denied && <Flash error="That page needs the owner role." />}
      {!checkoutOpen && (
        <p className="-mt-3 text-xs text-[#ffe680]/80">Development mode: live checkout is disabled. Orders, wallets and fulfillment items marked Test are not real.</p>
      )}

      <StatStrip
        items={[
          { label: "Total orders", value: c.total, hint: c.awaiting ? `${c.awaiting} awaiting payment` : undefined, href: `/admin/orders?sort=newest${scope}` },
          { label: "Pending payments", value: c.review, hint: c.info ? `+ ${c.info} waiting on customer` : c.review ? "Ready to verify" : "All caught up", tone: c.review ? "action" : undefined, href: `/admin/orders?status=review${scope}` },
          { label: "Approved payments", value: c.approved, tone: c.approved ? "good" : undefined, href: `/admin/orders?status=approved${scope}` },
          { label: "Rejected payments", value: c.rejected, tone: c.rejected ? "bad" : undefined, href: `/admin/orders?status=payment_rejected${scope}` },
          { label: "Awaiting fulfillment", value: c.fulfillment, hint: `${inventory} ${inventory === 1 ? "item" : "items"} in stock`, tone: c.fulfillment ? "info" : undefined, href: `/admin/orders?status=payment_verified${scope}` },
          { label: "Verified revenue", value: usd(c.revenue), hint: `${c.released} ${c.released === 1 ? "game" : "games"} released` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="queue" className="rounded-2xl border border-line bg-panel">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="queue" className="text-[0.9375rem] font-semibold">
              Needs attention
            </h2>
            <Link href={`/admin/orders?status=pending${scope}`} className="inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline">
              All pending
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          {queue.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing to review">
              New payment submissions and verified orders waiting for release appear here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((q) => (
                <li key={q.paymentId}>
                  <Link href={`/admin/orders/${q.paymentId}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-panel-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto_auto]">
                    <span className="font-mono text-[0.8125rem] text-sunset">{q.paymentId}</span>
                    <span className="min-w-0 truncate text-sm text-warm/75 max-sm:order-3 max-sm:col-span-2">
                      {q.email}
                      <span className="text-warm/40"> · {q.claimed ?? q.expected} {q.asset} on {networkLabel(q.network as NetworkId)}</span>
                    </span>
                    <StatusBadge status={q.status} />
                    <span className="text-right text-xs text-warm/45 tabular-nums max-sm:hidden" title={when(q.waitingSince)}>
                      {age(q.waitingSince)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity" className="rounded-2xl border border-line bg-panel">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <Activity aria-hidden className="size-4 text-lavender" />
            <h2 id="activity" className="text-[0.9375rem] font-semibold">
              Recent activity
            </h2>
          </div>
          {activity.length === 0 ? (
            <EmptyState icon={Inbox} title="No activity yet" />
          ) : (
            <ol className="grid gap-0 px-5 py-3">
              {activity.map((a) => (
                <li key={a.id} className="relative border-l border-line py-2 pl-4 text-sm">
                  <span aria-hidden className="absolute top-3.5 -left-[3px] size-1.5 rounded-full bg-line-strong" />
                  <Link href={`/admin/orders/${a.paymentId}`} className="font-mono text-xs text-warm/80 hover:text-sunset">
                    {a.paymentId}
                  </Link>
                  <span className="block text-warm/70">{statusInfo[a.to].label}</span>
                  <span className="block text-xs text-warm/40">
                    {a.actor.replace(/^admin:/, "")} · {age(a.at)} ago
                  </span>
                </li>
              ))}
            </ol>
          )}
          {c.fulfillment > 0 && inventory === 0 && (
            <p className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-lavender/10 px-3 py-2 text-xs text-lavender">
              <PackageCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Verified orders are waiting but there is no {dataset} stock. Add codes in Game Fulfillment.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

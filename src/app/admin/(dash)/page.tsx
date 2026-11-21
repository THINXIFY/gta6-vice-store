import { Activity, ArrowRight, CheckCircle2, Clock, Inbox, PackageCheck, Rocket, ScanSearch, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ago, age, EmptyState, Flash, PageHeader, Segmented, StatusBadge, usd, when } from "@/components/admin/ui";
import type { NetworkId } from "@/config/payments";
import { checkoutOpen } from "@/lib/checkout";
import { networkLabel } from "@/lib/orders/methods";
import { statusInfo, type OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { overview, type Dataset } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { launchChecks } from "@/server/launch";

export const metadata = { title: "Overview" };

const DOT: Partial<Record<OrderStatus, string>> = {
  payment_submitted: "bg-sunset",
  under_review: "bg-lavender",
  info_required: "bg-warning",
  payment_verified: "bg-success",
  game_ready: "bg-success-soft",
  payment_rejected: "bg-vice",
};

/** One headline figure: label, big value, a short line of context, and where to act on it. */
function Kpi({ icon: Icon, label, value, hint, href, action, tone }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; href?: string; action?: string; tone?: "action" | "good" | "info" }) {
  const accent = { action: "text-sunset bg-sunset/12", good: "text-success bg-success/12", info: "text-lavender bg-lavender/12" }[tone ?? "info"];
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-warm/65">{label}</span>
        <span aria-hidden className={cn("grid size-8 place-items-center rounded-lg", tone ? accent : "bg-panel-2 text-warm/50")}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={cn("mt-3 text-[2rem] leading-none font-semibold tracking-tight tabular-nums", tone === "action" && "text-sunset")}>{value}</p>
      <div className="mt-2.5 flex min-h-5 items-center justify-between gap-2 text-xs text-warm/50">
        <span className="truncate">{hint}</span>
        {action && (
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-warm/80 transition-colors group-hover:text-sunset">
            {action} <ArrowRight aria-hidden className="size-3.5" />
          </span>
        )}
      </div>
    </>
  );
  const cls = cn("group block rounded-2xl border bg-panel p-5 transition-colors", tone === "action" ? "border-sunset/30" : "border-line", href && "hover:border-line-strong hover:bg-panel-2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vice");
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * Overview: what needs doing first (payments to review, launch readiness), then the few figures
 * that matter, the queue and recent activity. Live and test figures are never mixed.
 */
export default async function Overview({ searchParams }: { searchParams: Promise<{ denied?: string; data?: string }> }) {
  const me = await requireAdmin(); // never rely on the layout alone for auth
  const sp = await searchParams;
  // Live and test figures are never mixed. While checkout is closed every order is a test.
  const dataset: Dataset = sp.data === "live" || sp.data === "test" ? sp.data : checkoutOpen ? "live" : "test";
  const [{ counts: c, split, inventory, queue, activity }, checks] = await Promise.all([overview(dataset), me.role === "owner" ? launchChecks() : Promise.resolve([])]);
  const scope = `&dataset=${dataset}`;
  const required = checks.filter((k) => k.required);
  const ready = required.filter((k) => k.ok).length;
  const firstOpen = required.find((k) => !k.ok);

  return (
    <div className="grid gap-6">
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

      {/* Launch readiness: owners only, until every required item is ready. */}
      {required.length > 0 && ready < required.length && (
        <Link
          href="/admin/launch"
          className="group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-[linear-gradient(100deg,color-mix(in_oklab,var(--color-vice)_10%,var(--color-panel)),var(--color-panel)_60%)] p-5 transition-colors hover:border-line-strong"
        >
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-vice/15 text-vice">
            <Rocket className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Launch readiness: {ready} of {required.length} required items ready
            </p>
            <p className="mt-0.5 truncate text-sm text-warm/55">{firstOpen ? `Next: ${firstOpen.title.toLowerCase()}.` : ""}</p>
            <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-well" aria-hidden>
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-vice),var(--color-sunset))]" style={{ width: `${Math.round((ready / required.length) * 100)}%` }} />
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warm/85 group-hover:text-sunset">
            Open checklist <ArrowRight aria-hidden className="size-4" />
          </span>
        </Link>
      )}

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={ScanSearch}
          label="To review"
          value={c.review}
          tone={c.review ? "action" : undefined}
          hint={c.review ? (c.info ? `+ ${c.info} waiting on the customer` : "Verify on the blockchain") : c.info ? `${c.info} waiting on the customer` : "All caught up"}
          href={`/admin/orders?status=review${scope}`}
          action={c.review ? "Review" : undefined}
        />
        <Kpi icon={Clock} label="Awaiting payment" value={c.awaiting} hint={`${c.total} ${c.total === 1 ? "order" : "orders"} in total`} href={`/admin/orders?sort=newest${scope}`} />
        <Kpi
          icon={Wallet}
          label="Verified revenue"
          value={usd(c.revenue)}
          tone={c.revenue ? "good" : undefined}
          hint={`${c.approved} approved · ${c.rejected} rejected · ${c.released} released`}
          href={`/admin/orders?status=approved${scope}`}
        />
        <Kpi
          icon={PackageCheck}
          label="Codes in stock"
          value={inventory}
          tone={c.fulfillment && !inventory ? "action" : undefined}
          hint={c.fulfillment ? `${c.fulfillment} verified ${c.fulfillment === 1 ? "order waits" : "orders wait"} for a code` : `${dataset === "test" ? "Test" : "Live"} codes ready to send`}
          href="/admin/fulfillment"
          action={c.fulfillment && !inventory ? "Add codes" : undefined}
        />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="queue" className="overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 id="queue" className="text-[0.9375rem] font-semibold">
                Needs attention
              </h2>
              <p className="mt-0.5 text-xs text-warm/45">Oldest first. Payments to verify and verified orders waiting for their code.</p>
            </div>
            <Link href={`/admin/orders?status=pending${scope}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sunset hover:underline">
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
                  <Link href={`/admin/orders/${q.paymentId}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-panel-2/60 md:grid-cols-[10.5rem_minmax(0,1fr)_auto_4.5rem]">
                    <span className="font-mono text-[0.8125rem] text-sunset">{q.paymentId}</span>
                    <span className="min-w-0 max-md:order-3 max-md:col-span-2">
                      <span className="block truncate text-sm text-warm/85">{q.email}</span>
                      <span className="block truncate text-xs text-warm/45">
                        {q.claimed ?? q.expected} {q.asset} · {networkLabel(q.network as NetworkId)}
                      </span>
                    </span>
                    <StatusBadge status={q.status} />
                    <span className="text-right text-xs text-warm/45 tabular-nums max-md:hidden" title={`Waiting since ${when(q.waitingSince)}`}>
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
            <ol className="divide-y divide-line/60 px-5">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[a.to] ?? "bg-line-strong")} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="text-warm/85">{statusInfo[a.to].label}</span>
                      <span className="text-xs text-warm/40 tabular-nums" title={when(a.at)}>
                        {ago(a.at)}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-warm/45">
                      <Link href={`/admin/orders/${a.paymentId}`} className="font-mono text-warm/65 hover:text-sunset">
                        {a.paymentId}
                      </Link>{" "}
                      by {a.actor.replace(/^admin:/, "")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

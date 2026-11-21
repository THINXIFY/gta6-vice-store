"use client";

import Link from "next/link";
import { AlertCircle, Check, CheckCircle2, Circle, Clock, ExternalLink, Gamepad2, LifeBuoy, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { assets, networks, targetProcessingMinutes } from "@/config/payments";
import { editions, game, platforms } from "@/config/product";
import { site } from "@/config/site";
import { pageHref } from "@/lib/pages";
import type { PlatformId } from "@/config/types";
import { formatPrice } from "@/lib/pricing";
import { networkLabel } from "@/lib/orders/methods";
import { orderStore, rememberAccessKey } from "@/lib/orders/store";
import { statusInfo, timeline, type Order } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { CoinIcon } from "./CoinIcon";
import { CopyButton, TestBadge } from "./ui";


const fieldClass = "h-13 w-full rounded-xl border border-warm/14 bg-obsidian/60 px-4 text-[0.9375rem] text-warm placeholder:text-warm/35 focus:border-sunset/70 focus:outline-none";

/** Official redemption destinations (public, first-party). The code itself only ever comes from the backend after approval. */
const REDEEM: Record<PlatformId, { label: string; href: string; steps: string[] }> = {
  ps5: {
    label: "Redeem on PlayStation Store",
    href: "https://store.playstation.com/redeem",
    steps: ["Sign in to the PlayStation Network account you play on.", "Open Redeem Codes and enter your code.", "Download Grand Theft Auto VI from your Game Library."],
  },
  "xbox-series": {
    label: "Redeem on Xbox",
    href: "https://redeem.microsoft.com",
    steps: ["Sign in to the Microsoft account you use on your Xbox.", "Enter your code at the redeem page or in the Microsoft Store on your console.", "Install Grand Theft Auto VI from My games & apps."],
  },
};

const TONE = {
  wait: { icon: Clock, ring: "border-sunset/40 bg-sunset/[0.06]", text: "text-sunset" },
  action: { icon: AlertCircle, ring: "border-[#ffd400]/35 bg-[#ffd400]/[0.06]", text: "text-[#ffe680]" },
  good: { icon: CheckCircle2, ring: "border-[#7be3ae]/30 bg-[#7be3ae]/[0.06]", text: "text-[#7be3ae]" },
  bad: { icon: XCircle, ring: "border-vice/35 bg-vice/[0.07]", text: "text-[#ff9fc4]" },
} as const;


function Timeline({ order }: { order: Order }) {
  const off = order.status === "payment_rejected" || order.status === "order_expired" || order.status === "info_required";
  const reachedIndex = Math.max(...order.history.map((h) => timeline.indexOf(h.status)), 0);
  const current = timeline.indexOf(order.status);
  return (
    <ol aria-label="Order progress" className="grid gap-0">
      {timeline.map((s, i) => {
        const done = current > i || (current === -1 && i <= reachedIndex);
        const active = current === i;
        const at = [...order.history].reverse().find((h) => h.status === s)?.at;
        return (
          <li key={s} data-step-status={done ? "done" : active ? "current" : "todo"} className="relative flex gap-4 pb-7 last:pb-0">
            {i < timeline.length - 1 && <span aria-hidden className={cn("absolute top-7 bottom-0 left-[0.8125rem] w-px", done ? "bg-sunset/60" : "bg-warm/12")} />}
            <span
              aria-hidden
              className={cn(
                "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border",
                done && "border-sunset bg-sunset text-obsidian",
                active && !off && "border-sunset bg-obsidian text-sunset shadow-[0_0_0_5px_rgb(255_155_98/0.15)]",
                !done && !(active && !off) && "border-warm/20 bg-obsidian text-warm/30",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : active && !off ? <span className="size-2 animate-pulse rounded-full bg-sunset" /> : <Circle className="size-2.5" />}
            </span>
            <div className="pt-0.5">
              <p className={cn("font-semibold", !done && !active && "text-warm/40")}>
                {statusInfo[s].label}
                <span className="sr-only">{done ? " (done)" : active ? " (current)" : ""}</span>
              </p>
              {at && (done || active) && <p className="text-xs text-warm/45">{new Date(at).toLocaleString(site.locale, { dateStyle: "medium", timeStyle: "short" })}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function GameAccess({ order }: { order: Order }) {
  const r = REDEEM[order.platform];
  const f = order.fulfillment;
  return (
    <section aria-labelledby="access-title" className="swap-in overflow-hidden rounded-media border border-[#7be3ae]/25 bg-[linear-gradient(160deg,rgb(123_227_174/0.08),transparent_55%)]">
      <div className="p-6 sm:p-8">
        <Gamepad2 aria-hidden className="size-9 text-[#7be3ae]" strokeWidth={1.75} />
        <h2 id="access-title" className="mt-4 font-display text-display-md font-extrabold tracking-[-0.005em]">
          Your game is ready
        </h2>
        <p className="mt-3 text-warm/70">Payment confirmed. Redeem your code on the account you play on.</p>
        <div className="mt-6 rounded-xl bg-obsidian/70 p-5">
          <p className="text-xs text-warm/50">Your {platforms.find((p) => p.id === order.platform)!.shortName} code</p>
          {/* Returned by the server only after approval, and only with the access key. */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-3 font-mono text-xl tracking-[0.12em]">
              {f?.code}
              {f?.test && <TestBadge />}
            </p>
            {f && <CopyButton value={f.code} label="game code" />}
          </div>
        </div>
        <ol className="mt-6 grid gap-3 text-[0.9375rem] text-warm/75">
          {r.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="font-display text-sunset">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <a
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex h-13 items-center gap-2 rounded-control bg-warm px-6 font-semibold text-obsidian transition-colors hover:bg-white"
        >
          {r.label}
          <ExternalLink aria-hidden className="size-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}

function OrderView({ order }: { order: Order }) {
  const info = statusInfo[order.status];
  const tone = TONE[info.tone];
  const Icon = tone.icon;
  const ed = editions.find((e) => e.id === order.edition)!;
  const pf = platforms.find((p) => p.id === order.platform)!;
  const asset = assets.find((a) => a.id === order.quote.asset)!;
  const verified = order.status === "payment_verified" || order.status === "game_ready";

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="grid content-start gap-8 lg:col-span-7">
        <section aria-live="polite" className={cn("rounded-media border p-6 sm:p-8", tone.ring)}>
          <p className={cn("flex items-center gap-2 text-sm font-semibold", tone.text)}>
            <Icon aria-hidden className="size-4.5" />
            {info.label}
          </p>
          <p className="mt-3 text-lg text-warm/85">{info.detail}</p>
          {order.customerNote && <p className="mt-3 rounded-xl bg-obsidian/60 px-4 py-3 text-sm text-warm/75">{order.customerNote}</p>}
          {(order.status === "payment_submitted" || order.status === "under_review") && (
            <p className="mt-3 text-sm text-warm/60">
              Target processing time: {targetProcessingMinutes} minutes after submission. It can take longer while the network confirms the transaction.
            </p>
          )}
          {order.status === "awaiting_payment" && (
            <a href={`/checkout/payment?id=${order.paymentId}`} className="mt-5 inline-flex h-11 items-center rounded-control bg-warm px-5 text-sm font-semibold text-obsidian">
              Go to payment
            </a>
          )}
        </section>

        {order.status === "game_ready" &&
          (order.fulfillment ? (
            <GameAccess order={order} />
          ) : (
            <p className="rounded-media border border-warm/10 px-6 py-5 text-warm/75">
              Open your private order link (from the confirmation after payment) to see your game delivery details. Payment ID and email alone only show progress.
            </p>
          ))}

        <section aria-label="Progress" className="rounded-media border border-warm/10 bg-midnight/50 p-6 sm:p-8">
          <Timeline order={order} />
        </section>
      </div>

      <aside aria-label="Order details" className="grid content-start gap-6 lg:col-span-5">
        <div className="rounded-media border border-warm/10 bg-midnight/60 p-6">
          <p className="text-xs text-warm/50">Payment ID</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="flex items-center gap-3 font-mono text-lg tracking-wide">
              {order.paymentId}
              {order.test && <TestBadge />}
            </p>
            <CopyButton value={order.paymentId} label="Payment ID" />
          </div>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 border-t border-warm/10 pt-5 text-sm">
            <dt className="text-warm/55">Order reference</dt>
            <dd className="truncate text-right font-mono text-xs leading-5">{order.reference}</dd>
            <dt className="text-warm/55">Game</dt>
            <dd className="text-right">{game.title}</dd>
            <dt className="text-warm/55">Edition</dt>
            <dd className="text-right">{ed.name}</dd>
            <dt className="text-warm/55">Platform</dt>
            <dd className="text-right">{pf.name}</dd>
            <dt className="text-warm/55">Order value</dt>
            <dd className="text-right">{formatPrice({ amount: order.quote.usdCents, currency: "USD" })}</dd>
            <dt className="text-warm/55">Paid with</dt>
            <dd className="flex items-center justify-end gap-2 text-right">
              <CoinIcon asset={asset.id} className="size-5 text-[0.6rem]" />
              {order.quote.amount} {asset.id}
            </dd>
            <dt className="text-warm/55">Network</dt>
            <dd className="text-right">{networkLabel(order.quote.network)}</dd>
            <dt className="text-warm/55">Payment</dt>
            <dd className={cn("text-right font-medium", verified ? "text-[#7be3ae]" : "text-warm/70")}>{verified ? "Confirmed" : "Not confirmed yet"}</dd>
          </dl>
          {order.txid && (
            <div className="mt-5 border-t border-warm/10 pt-4 text-sm">
              <p className="text-warm/55">Transaction hash</p>
              <a
                href={networks[order.quote.network].explorer.replace("{tx}", order.txid)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1.5 font-mono text-xs text-sunset hover:underline"
              >
                <span className="truncate">{order.txid}</span>
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">(view on block explorer, opens in a new tab)</span>
              </a>
            </div>
          )}
        </div>

        <div className="flex gap-3 rounded-xl border border-warm/10 px-5 py-4 text-sm text-warm/65">
          <LifeBuoy aria-hidden className="mt-0.5 size-4 shrink-0 text-sunset" />
          <p>
            Need help?{" "}
            {pageHref("contact") ? (
              <Link href={pageHref("contact")} className="text-sunset hover:underline">
                Contact support
              </Link>
            ) : site.support.email ? (
              <a href={`mailto:${site.support.email}`} className="text-sunset hover:underline">
                {site.support.email}
              </a>
            ) : (
              "Support contact details will be listed here before payments open."
            )}{" "}
            and include your Payment ID.
          </p>
        </div>

      </aside>
    </div>
  );
}

/** Status lookup by Payment ID + email (both required, so a reference alone reveals nothing). */
export function OrderStatusView({ initialId }: { initialId: string }) {
  const [paymentId, setPaymentId] = useState(initialId);
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A private link carries the access key in the URL fragment (never sent to the server in
  // logs); store it, then open the full order. The browser that placed the order has it already.
  useEffect(() => {
    if (!initialId) return;
    const key = new URLSearchParams(window.location.hash.slice(1)).get("key");
    if (key) {
      rememberAccessKey(initialId, key);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    orderStore.get(initialId).then((o) => o && setOrder(o));
  }, [initialId]);

  const lookup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setOrder(await orderStore.lookup(paymentId, email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not find that order.");
    }
  };

  if (order) return <OrderView order={order} />;

  return (
    <form onSubmit={lookup} className="max-w-[32rem] rounded-media border border-warm/10 bg-midnight/60 p-6 sm:p-8">
      <div className="grid gap-5">
        <label className="grid gap-2 text-sm">
          <span className="text-warm/70">Payment ID</span>
          <input required value={paymentId} onChange={(e) => setPaymentId(e.target.value.toUpperCase())} placeholder="VICE-XXXXXXXX" className={cn(fieldClass, "font-mono")} autoComplete="off" spellCheck={false} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-warm/70">Email used for the order</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} autoComplete="email" />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-vice/10 px-4 py-3 text-sm text-[#ff9fc4]">
          {error}
        </p>
      )}
      <button type="submit" className="mt-6 inline-flex h-13 w-full items-center justify-center rounded-control bg-warm font-semibold text-obsidian transition-colors hover:bg-white">
        Check order status
      </button>
    </form>
  );
}

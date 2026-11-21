"use client";

import { AlertTriangle, Clock, KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { assets } from "@/config/payments";
import { editions, game, platforms } from "@/config/product";
import { formatPrice } from "@/lib/pricing";
import { networkLabel } from "@/lib/orders/methods";
import { paymentUri } from "@/lib/orders/paymentUri";
import { orderStore } from "@/lib/orders/store";
import type { Order } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { CoinIcon } from "./CoinIcon";
import { SubmitForm, Submitted } from "./SubmitProof";
import { PaymentQr, TestBadge, ValueRow } from "./ui";


/** Ticking clock; remaining time is derived, so a late-arriving `until` is never misread as expired. */
function useCountdown(until: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = until ? Date.parse(until) - now : Infinity;
  const s = Math.max(0, Math.floor((Number.isFinite(left) ? left : 0) / 1000));
  return { expired: left <= 0, text: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` };
}

/** Manual crypto invoice: exact amount, address, network warning, then TXID submission. */
export function PaymentInvoice({ paymentId }: { paymentId: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  useEffect(() => {
    orderStore.get(paymentId).then(setOrder);
  }, [paymentId]);
  const countdown = useCountdown(order?.quote.expiresAt);

  if (order === undefined) return <p className="text-warm/60">Loading your order…</p>;
  if (order === null) {
    return (
      <div className="max-w-[36rem]">
        <h2 className="font-display text-display-md font-extrabold">We could not find that order</h2>
        <p className="mt-4 text-warm/70">Check the Payment ID, or start a new checkout.</p>
        <Link href="/checkout" className="mt-6 inline-flex h-12 items-center rounded-control bg-warm px-6 text-sm font-semibold text-obsidian">
          Start checkout
        </Link>
      </div>
    );
  }
  if (order.status !== "awaiting_payment" && order.status !== "order_expired") return <Submitted order={order} />;

  const asset = assets.find((a) => a.id === order.quote.asset)!;
  const ed = editions.find((e) => e.id === order.edition)!;
  const pf = platforms.find((p) => p.id === order.platform)!;
  const net = networkLabel(order.quote.network);
  const expired = order.status === "order_expired" || countdown.expired;
  const qr = paymentUri(asset.id, order.quote.network, order.address ?? "", order.quote.amount);
  const sample = !order.address || order.address.startsWith("PREVIEW-");

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      {/* Invoice */}
      <section aria-labelledby="invoice-title" className="lg:col-span-7">
        <div className="overflow-hidden rounded-media border border-warm/10 bg-midnight/60">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm/10 bg-[linear-gradient(100deg,rgb(255_87_154/0.12),rgb(255_155_98/0.08)_60%,transparent)] px-6 py-5 sm:px-8">
            <div>
              <p className="text-xs text-warm/55">Payment ID</p>
              <p id="invoice-title" className="mt-0.5 flex items-center gap-3 font-mono text-lg tracking-wide">
                {order.paymentId}
                {order.test && <TestBadge />}
              </p>
            </div>
            <p className={cn("inline-flex items-center gap-2 rounded-control px-3.5 py-1.5 text-sm font-medium", expired ? "bg-vice/15 text-[#ff9fc4]" : "bg-obsidian/70 text-warm/80")}>
              <Clock aria-hidden className="size-4" />
              {expired ? "Quote expired" : <span aria-live="off">Amount held for {countdown.text}</span>}
            </p>
          </div>

          <div className="grid gap-8 px-6 py-7 sm:grid-cols-[1fr_auto] sm:px-8">
            <div className="min-w-0">
              <p className="text-sm text-warm/60">Send exactly</p>
              <p className="mt-2 flex items-center gap-3">
                <CoinIcon asset={asset.id} className="size-10 text-lg" />
                <span className="font-display text-[clamp(2.25rem,1.6rem+2.4vw,3.5rem)] leading-none font-extrabold tabular-nums">{order.quote.amount}</span>
                <span className="font-display text-2xl font-extrabold text-warm/60">{asset.id}</span>
              </p>
              <p className="mt-3 text-sm text-warm/60">
                {formatPrice({ amount: order.quote.usdCents, currency: "USD" })} USD
              </p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-control border border-sunset/40 px-3.5 py-1.5 text-sm">
                <span className="size-2 rounded-full bg-sunset" aria-hidden />
                Network: <strong className="font-semibold">{net}</strong>
              </p>
            </div>
            <figure className="mx-auto w-44 sm:mx-0 sm:w-48">
              <PaymentQr
                value={qr.uri}
                label={qr.includesAmount ? `QR code with the receiving address and exact amount on ${net}` : `QR code with the receiving address on ${net}`}
                className={cn("size-44 sm:size-48", expired && "opacity-25")}
              />
              <figcaption className="mt-2.5 text-center text-xs leading-snug text-warm/55 sm:text-left">
                {sample
                  ? "Sample address for testing. Do not send funds."
                  : qr.includesAmount
                    ? "Includes the address and exact amount. Check both in your wallet."
                    : "Scan for the address, then enter the exact amount yourself."}
              </figcaption>
            </figure>
          </div>

          <div className="divide-y divide-warm/8 border-t border-warm/10 px-6 sm:px-8">
            <ValueRow label={`Receiving address (${net})`} value={order.address ?? ""} />
            <ValueRow label="Exact amount" value={order.quote.amount} display={`${order.quote.amount} ${asset.id}`} />
            <ValueRow label="Payment ID" value={order.paymentId} />
          </div>

          <div role="alert" className="flex gap-3 border-t border-vice/25 bg-vice/[0.08] px-6 py-4 text-sm text-[#ffc2da] sm:px-8">
            <AlertTriangle aria-hidden className="mt-0.5 size-4.5 shrink-0" />
            <p>
              Send {asset.id} on <strong>{net}</strong> only. Payments sent on another network or in another coin may be lost and cannot be recovered.
            </p>
          </div>
        </div>
      </section>

      {/* Instructions + submission */}
      <div className="grid content-start gap-8 lg:col-span-5">
        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-xl font-semibold">
            How to pay
          </h2>
          <ol className="mt-5 grid gap-4">
            {[
              `Open your wallet or exchange and choose ${asset.id} on ${net}.`,
              "Scan the QR code with your wallet, or copy the receiving address.",
              `Send exactly ${order.quote.amount} ${asset.id}. Exchanges may deduct a fee, so make sure the received amount is exact.`,
              "Copy the transaction hash (TXID) from your wallet and submit it below.",
            ].map((t, i) => (
              <li key={i} className="flex gap-4 text-[0.9375rem] leading-relaxed text-warm/75">
                <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-warm/8 font-display text-sm text-sunset">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
          <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-warm/[0.04] px-4 py-3 text-sm text-warm/60">
            <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0 text-sunset" />
            We will never ask for your private keys or recovery phrase.
          </p>
        </section>

        <div className="rounded-xl border border-warm/10 px-5 py-4 text-sm">
          <p className="text-warm/50">Your order</p>
          <p className="mt-1 font-semibold">
            {game.title}, {ed.name}
          </p>
          <p className="text-warm/60">{pf.name}</p>
        </div>

        {expired ? (
          <div className="rounded-media border border-vice/25 bg-vice/[0.06] p-6">
            <h2 className="text-xl font-semibold">This quote has expired</h2>
            <p className="mt-2 text-sm text-warm/70">Do not send a payment for this order. Start a new checkout to get a fresh amount.</p>
            <Link href={`/checkout?edition=${order.edition}&platform=${order.platform}`} className="mt-5 inline-flex h-12 items-center rounded-control bg-warm px-6 text-sm font-semibold text-obsidian">
              Start a new checkout
            </Link>
          </div>
        ) : (
          <SubmitForm order={order} onDone={setOrder} />
        )}
      </div>
    </div>
  );
}

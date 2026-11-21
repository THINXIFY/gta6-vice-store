"use client";

import { AlertTriangle, CheckCircle2, ClipboardPaste, Clock, HelpCircle, ImagePlus, Loader2, Send, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { networks, targetProcessingMinutes, txPatterns } from "@/config/payments";
import { networkLabel } from "@/lib/orders/methods";
import { accessKeyFor, orderStore } from "@/lib/orders/store";
import { statusInfo, type Order } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { CopyButton, DeliveryNote } from "./ui";

const MAX_SHOT = 5 * 1024 * 1024;
const SHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Private link that restores full access (incl. game delivery) on another device. Key stays in the URL fragment. */
function AccessLink({ paymentId }: { paymentId: string }) {
  // Rendered only client-side (after the order loads), so window is available.
  const [link] = useState(() => {
    const key = typeof window === "undefined" ? undefined : accessKeyFor(paymentId);
    return key ? window.location.origin + "/order-status?id=" + paymentId + "#key=" + key : null;
  });
  if (!link) return <p className="mt-6 text-sm text-warm/55">Keep your Payment ID. You need it with your email to check your order.</p>;
  return (
    <div className="mt-6 rounded-xl border border-warm/10 px-5 py-4">
      <p className="text-sm font-semibold">Your private order link</p>
      <p className="mt-1 text-sm text-warm/60">Save it. It is the only way to receive your game on another device. Don’t share it.</p>
      <div className="mt-3 flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-warm/70">{link}</p>
        <CopyButton value={link} label="private order link" />
      </div>
    </div>
  );
}

/** Confirmation after proof submission. */
export function Submitted({ order }: { order: Order }) {
  return (
    <section aria-labelledby="submitted-title" className="swap-in rounded-media border border-success/25 bg-success/[0.05] p-6 sm:p-10">
      <CheckCircle2 aria-hidden className="size-10 text-success" strokeWidth={1.75} />
      <h2 id="submitted-title" className="mt-5 font-display text-display-md font-extrabold tracking-[-0.005em]">
        Payment submitted successfully
      </h2>
      <p className="mt-4 max-w-[40rem] leading-relaxed text-warm/75">
        Your payment details have been received and are awaiting manual verification. Our target processing time is {targetProcessingMinutes} minutes.
        Processing may take longer depending on network confirmations and payment verification.
      </p>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-xl bg-warm/8 md:grid-cols-3">
        <div className="bg-obsidian/80 px-5 py-4">
          <dt className="text-xs text-warm/50">Payment ID</dt>
          <dd className="mt-1 flex items-center justify-between gap-3 font-mono text-[0.9375rem] tracking-wide">
            {order.paymentId}
            <CopyButton value={order.paymentId} label="Payment ID" />
          </dd>
        </div>
        <div className="bg-obsidian/80 px-5 py-4">
          <dt className="text-xs text-warm/50">Amount you reported</dt>
          <dd className="mt-1 font-mono text-[0.9375rem]">
            {order.claimedAmount ?? order.quote.amount} {order.quote.asset}
          </dd>
        </div>
        <div className="bg-obsidian/80 px-5 py-4">
          <dt className="text-xs text-warm/50">Status</dt>
          <dd className="mt-1 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-sunset">
            <Clock aria-hidden className="size-4" />
            {statusInfo[order.status].label}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-warm/60">Estimated processing time: about {targetProcessingMinutes} minutes after submission.</p>
      <DeliveryNote className="mt-6 max-w-[44rem]" />

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/order-status?id=${order.paymentId}`} className="inline-flex h-12 items-center rounded-control bg-warm px-6 text-sm font-semibold text-obsidian transition-colors hover:bg-white">
          Track your order
        </Link>
        <Link href="/" className="inline-flex h-12 items-center rounded-control bg-warm/10 px-6 text-sm font-semibold hover:bg-warm/16">
          Back to the store
        </Link>
      </div>
      <AccessLink paymentId={order.paymentId} />
    </section>
  );
}

/** A field label with an optional right-aligned action. */
function FieldHead({ htmlFor, label, extra, action }: { htmlFor?: string; label: string; extra?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium text-warm/85">
        {label} {extra && <span className="font-normal text-warm/45">{extra}</span>}
      </label>
      {action}
    </div>
  );
}

function InlineError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-danger-soft">
      <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  );
}

type FieldKey = "txid" | "amount" | "shot";

/** Payment proof form: order facts at a glance, then TXID, amount, screenshot and an optional message. */
export function SubmitForm({ order, onDone }: { order: Order; onDone: (o: Order) => void }) {
  const family = networks[order.quote.network].family;
  const net = networkLabel(order.quote.network);
  const [claimed, setClaimed] = useState("");
  const [txid, setTxid] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const hint = family === "evm" ? "Starts with 0x, 66 characters" : family === "hex64" ? "64 letters and numbers" : "The transaction signature, about 88 characters";
  const txOk = txPatterns[family].test(txid.trim());
  const amountOk = /^[0-9]+(\.[0-9]+)?$/.test(claimed.trim());
  const exact = claimed.trim() === order.quote.amount;
  const setFieldError = (k: FieldKey, v?: string) => setErrors((e) => ({ ...e, [k]: v }));

  const pick = (f: File | null) => {
    setFieldError("shot");
    setPreview(null);
    if (!f && fileInput.current) fileInput.current.value = "";
    if (f && !SHOT_TYPES.includes(f.type)) {
      setFile(null);
      return setFieldError("shot", "The screenshot must be a PNG, JPG or WebP image.");
    }
    if (f && f.size === 0) {
      setFile(null);
      return setFieldError("shot", "That file is empty. Choose another screenshot.");
    }
    if (f && f.size > MAX_SHOT) {
      setFile(null);
      return setFieldError("shot", "The screenshot must be 5 MB or smaller.");
    }
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setTxid(text);
        setFieldError("txid");
      }
    } catch {
      // Clipboard access refused: let the buyer paste by hand.
      document.getElementById("txid")?.focus();
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return; // no double submission
    setError(null);
    const next: Partial<Record<FieldKey, string>> = {
      txid: txOk
        ? undefined
        : txid.trim()
          ? `That does not look like a ${networks[order.quote.network].name} transaction hash. ${hint}.`
          : "Paste the transaction hash from your wallet or exchange.",
      amount: amountOk ? undefined : `Enter the amount you sent, for example ${order.quote.amount}.`,
      shot: file ? undefined : "Add a screenshot of the payment from your wallet or exchange.",
    };
    setErrors(next);
    // Take the buyer to the first field that still needs attention.
    const first = (["txid", "amount", "shot"] as const).find((k) => next[k]);
    if (first) {
      (first === "shot" ? document.querySelector<HTMLElement>("[data-shot-drop]") : document.getElementById(first))?.focus();
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set("paymentId", order.paymentId);
    form.set("email", order.email ?? "");
    form.set("txid", txid.trim());
    form.set("claimedAmount", claimed.trim());
    form.set("message", message.trim());
    form.set("screenshot", file!);
    try {
      onDone(await orderStore.submitPayment(form));
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "We could not submit your payment. Please try again.");
    }
  };

  const inputBase =
    "h-13 w-full rounded-xl border bg-obsidian/60 text-sm text-warm placeholder:font-sans placeholder:text-warm/35 transition-colors focus:border-sunset/70 focus:outline-none";
  const tone = (bad?: string, good?: boolean) => (bad ? "border-vice/70" : good ? "border-success/40" : "border-warm/14");

  return (
    <form onSubmit={submit} noValidate aria-labelledby="submit-title" className="overflow-hidden rounded-media border border-warm/10 bg-midnight/60">
      <div className="border-b border-warm/10 px-6 pt-6 pb-5 sm:px-8">
        <h2 id="submit-title" className="text-xl font-semibold">
          Submit your payment
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-warm/60">Sent it? Add the transaction details so we can find it on the blockchain.</p>

        {/* Order facts at a glance (read-only, so they are not shaped like inputs). */}
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-obsidian/50 px-4 py-3.5 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-warm/45">Payment ID</dt>
            <dd className="mt-0.5 truncate font-mono text-warm/90">{order.paymentId}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-warm/45">Expected amount</dt>
            <dd className="mt-0.5 truncate font-mono text-warm/90">
              {order.quote.amount} {order.quote.asset}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-warm/45">Network</dt>
            <dd className="mt-0.5 truncate text-warm/90">{net}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-warm/45">Email</dt>
            <dd className="mt-0.5 truncate text-warm/90">{order.email}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:px-8">
        {/* Transaction hash */}
        <div className="grid gap-2">
          <FieldHead
            htmlFor="txid"
            label="Transaction hash (TXID)"
            action={
              <button type="button" onClick={paste} className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-semibold text-sunset hover:bg-sunset/10">
                <ClipboardPaste aria-hidden className="size-3.5" />
                Paste
              </button>
            }
          />
          <div className="relative">
            <input
              id="txid"
              value={txid}
              onChange={(e) => {
                setTxid(e.target.value);
                if (errors.txid) setFieldError("txid");
              }}
              placeholder={hint}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.txid) || undefined}
              aria-describedby={errors.txid ? "txid-error" : "txid-hint"}
              className={cn(inputBase, "pr-11 pl-4 font-mono", tone(errors.txid, txOk))}
            />
            {txOk && <CheckCircle2 aria-label="Looks valid" className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-success" />}
          </div>
          {errors.txid ? (
            <InlineError id="txid-error">{errors.txid}</InlineError>
          ) : (
            <p id="txid-hint" className="text-xs text-warm/45">
              On {net}. Never paste a private key or recovery phrase here.
            </p>
          )}
          <details className="text-xs text-warm/55">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-warm/65 hover:text-warm [&::-webkit-details-marker]:hidden">
              <HelpCircle aria-hidden className="size-3.5" />
              Where do I find it?
            </summary>
            <p className="mt-2 rounded-lg bg-warm/[0.04] px-3 py-2.5 leading-relaxed">
              In your wallet, open the transfer in your activity or history. On an exchange, open the withdrawal in your withdrawal history. It is labelled TXID, Tx hash or Transaction ID.
            </p>
          </details>
        </div>

        {/* Amount sent */}
        <div className="grid gap-2">
          <FieldHead
            htmlFor="amount"
            label={`Amount you sent (${order.quote.asset})`}
            action={
              !exact && (
                <button
                  type="button"
                  onClick={() => {
                    setClaimed(order.quote.amount);
                    setFieldError("amount");
                  }}
                  className="rounded-control px-2 py-1 text-xs font-semibold text-sunset hover:bg-sunset/10"
                >
                  Use exact amount
                </button>
              )
            }
          />
          <div className="relative">
            <input
              id="amount"
              inputMode="decimal"
              value={claimed}
              onChange={(e) => {
                setClaimed(e.target.value);
                if (errors.amount) setFieldError("amount");
              }}
              placeholder={order.quote.amount}
              autoComplete="off"
              aria-invalid={Boolean(errors.amount) || undefined}
              aria-describedby={errors.amount ? "amount-error" : "amount-hint"}
              className={cn(inputBase, "pr-20 pl-4 font-mono", tone(errors.amount, amountOk && exact))}
            />
            <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-warm/45">
              {order.quote.asset}
            </span>
          </div>
          {errors.amount ? (
            <InlineError id="amount-error">{errors.amount}</InlineError>
          ) : (
            <p id="amount-hint" className="text-xs text-warm/45">
              {amountOk && !exact ? `Different from the ${order.quote.amount} ${order.quote.asset} expected. Enter what you actually sent; we check what arrived.` : "The amount that left your wallet or exchange."}
            </p>
          )}
        </div>

        {/* Screenshot */}
        <div className="grid gap-2">
          <span id="shot-label" className="text-sm font-medium text-warm/85">
            Payment screenshot <span className="font-normal text-warm/45">(PNG, JPG or WebP, up to 5 MB)</span>
          </span>
          {file && preview ? (
            <div className="flex items-center gap-4 rounded-xl border border-success/30 bg-success/[0.04] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, never uploaded anywhere else */}
              <img src={preview} alt="Selected payment screenshot" className="h-20 w-16 shrink-0 rounded-lg bg-warm/5 object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{file.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle2 aria-hidden className="size-3.5" />
                  {file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}, ready to submit
                </span>
                <button type="button" onClick={() => fileInput.current?.click()} className="mt-1.5 text-xs font-semibold text-sunset hover:underline">
                  Replace
                </button>
              </span>
              <button type="button" onClick={() => pick(null)} aria-label="Remove screenshot" className="grid size-9 shrink-0 place-items-center rounded-full text-warm/60 hover:bg-warm/10 hover:text-warm">
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ) : (
            // A real button (keyboard and click) that opens the hidden file input; dropping a file also works.
            <button
              type="button"
              data-shot-drop
              onClick={() => fileInput.current?.click()}
              aria-describedby={errors.shot ? "shot-error shot-label" : "shot-label"}
              onDragOver={(e: DragEvent) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-4 rounded-xl border border-dashed px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender focus-visible:outline-solid",
                dragging ? "border-sunset bg-sunset/[0.06]" : errors.shot ? "border-vice/60" : "border-warm/20 hover:border-sunset/60 hover:bg-warm/[0.02]",
              )}
            >
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-sunset/12 text-sunset">
                <ImagePlus className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Choose a screenshot or drop it here</span>
                <span className="mt-0.5 block text-xs text-warm/50">Show the amount, the receiving address and the transaction hash if you can.</span>
              </span>
            </button>
          )}
          {errors.shot && <InlineError id="shot-error">{errors.shot}</InlineError>}
          <input
            ref={fileInput}
            type="file"
            aria-required="true"
            accept="image/png,image/jpeg,image/webp"
            aria-labelledby="shot-label"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              pick(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>

        {/* Message */}
        <div className="grid gap-2">
          <FieldHead htmlFor="message" label="Message" extra="(optional)" />
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="For example: sent from my Binance account"
            className="w-full resize-y rounded-xl border border-warm/14 bg-obsidian/60 px-4 py-3 text-sm text-warm placeholder:text-warm/35 focus:border-sunset/70 focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-warm/10 bg-obsidian/30 px-6 py-6 sm:px-8">
        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-vice/10 px-4 py-3 text-sm text-danger-soft">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-control bg-[linear-gradient(100deg,var(--color-vice)_0%,var(--color-blend)_45%,var(--color-sunset)_100%)] bg-[length:140%_100%] bg-left font-semibold text-obsidian transition-[background-position] duration-500 hover:bg-right disabled:opacity-60"
        >
          {busy ? <Loader2 aria-hidden className="size-4.5 animate-spin" /> : <Send aria-hidden className="size-4.5" />}
          {busy ? "Submitting…" : "Submit payment for verification"}
        </button>
        <p className="mt-3 flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-warm/45">
          <ShieldCheck aria-hidden className="mt-px size-3.5 shrink-0" />A person checks every transfer on the blockchain. A screenshot alone is not proof of payment.
        </p>
      </div>
    </form>
  );
}

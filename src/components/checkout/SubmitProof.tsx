"use client";

import { CheckCircle2, Clock, ImagePlus, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { networks, targetProcessingMinutes, txPatterns } from "@/config/payments";
import { networkLabel } from "@/lib/orders/methods";
import { accessKeyFor, orderStore } from "@/lib/orders/store";
import { statusInfo, type Order } from "@/lib/orders/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "./ui";

const fieldClass =
  "h-13 w-full rounded-xl border border-warm/14 bg-obsidian/60 px-4 font-mono text-sm text-warm placeholder:font-sans placeholder:text-warm/35 focus:border-sunset/70 focus:outline-none";
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
    <section aria-labelledby="submitted-title" className="swap-in rounded-media border border-[#7be3ae]/25 bg-[#7be3ae]/[0.05] p-6 sm:p-10">
      <CheckCircle2 aria-hidden className="size-10 text-[#7be3ae]" strokeWidth={1.75} />
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

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-2 text-sm">
      <span className="text-warm/70">{label}</span>
      <p className={cn("flex min-h-13 items-center rounded-xl border border-warm/8 bg-warm/[0.03] px-4 py-2 break-all text-warm/85", mono && "font-mono")}>{value}</p>
    </div>
  );
}

/** Payment proof form: read-only order facts plus amount, TXID, screenshot and message. */
export function SubmitForm({ order, onDone }: { order: Order; onDone: (o: Order) => void }) {
  const family = networks[order.quote.network].family;
  const [claimed, setClaimed] = useState("");
  const [txid, setTxid] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const hint = family === "evm" ? "Starts with 0x, 66 characters" : family === "hex64" ? "64 letters and numbers" : "The transaction signature, about 88 characters";

  const pick = (f: File | null) => {
    setError(null);
    setPreview(null);
    if (!f && fileInput.current) fileInput.current.value = "";
    if (f && !SHOT_TYPES.includes(f.type)) {
      setFile(null);
      return setError("The screenshot must be a PNG, JPG or WebP image.");
    }
    if (f && f.size === 0) {
      setFile(null);
      return setError("That file is empty. Choose another screenshot.");
    }
    if (f && f.size > MAX_SHOT) {
      setFile(null);
      return setError("The screenshot must be 5 MB or smaller.");
    }
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return; // no double submission
    setError(null);
    if (!/^[0-9]+(\.[0-9]+)?$/.test(claimed.trim())) return setError(`Enter the amount you sent, for example ${order.quote.amount}.`);
    if (!txPatterns[family].test(txid.trim())) return setError(`That does not look like a ${networks[order.quote.network].name} transaction hash. ${hint}.`);
    if (!file) return setError("Add a screenshot of the payment from your wallet or exchange.");
    setBusy(true);
    const form = new FormData();
    form.set("paymentId", order.paymentId);
    form.set("email", order.email ?? "");
    form.set("txid", txid.trim());
    form.set("claimedAmount", claimed.trim());
    form.set("message", message.trim());
    form.set("screenshot", file);
    try {
      onDone(await orderStore.submitPayment(form));
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "We could not submit your payment. Please try again.");
    }
  };

  return (
    <form onSubmit={submit} aria-labelledby="submit-title" className="rounded-media border border-warm/10 bg-midnight/60 p-6 sm:p-8">
      <h2 id="submit-title" className="text-xl font-semibold">
        Submit your payment
      </h2>
      <p className="mt-2 text-sm text-warm/60">After sending, add your transaction details so we can verify the payment on the blockchain.</p>

      <div className="mt-6 grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <ReadOnly label="Email" value={order.email ?? ""} />
          <ReadOnly label="Payment ID" value={order.paymentId} mono />
          <ReadOnly label="Cryptocurrency and network" value={`${order.quote.asset} on ${networkLabel(order.quote.network)}`} />
          <ReadOnly label="Expected amount" value={`${order.quote.amount} ${order.quote.asset}`} mono />
        </div>

        <label className="grid gap-2 text-sm">
          <span className="text-warm/70">Amount you sent ({order.quote.asset})</span>
          <input required inputMode="decimal" value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder={order.quote.amount} className={fieldClass} autoComplete="off" />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-warm/70">Transaction hash (TXID)</span>
          <input required value={txid} onChange={(e) => setTxid(e.target.value)} placeholder={hint} className={fieldClass} autoComplete="off" spellCheck={false} aria-describedby="txid-hint" />
          <span id="txid-hint" className="text-xs text-warm/45">
            On {networkLabel(order.quote.network)}. Never paste a private key or recovery phrase here.
          </span>
        </label>

        <div className="grid gap-2 text-sm">
          <span id="shot-label" className="text-warm/70">
            Payment screenshot <span className="text-warm/45">(PNG, JPG or WebP, up to 5 MB)</span>
          </span>
          {file && preview ? (
            <div className="flex items-center gap-4 rounded-xl border border-warm/14 bg-obsidian/60 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, never uploaded anywhere else */}
              <img src={preview} alt="Selected payment screenshot" className="h-24 w-20 shrink-0 rounded-lg bg-warm/5 object-contain" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{file.name}</span>
                <span className="block text-xs text-warm/50">{(file.size / 1024 / 1024).toFixed(2)} MB, ready to submit</span>
                <button type="button" onClick={() => fileInput.current?.click()} className="mt-2 text-xs font-semibold text-sunset hover:underline">
                  Replace
                </button>
              </span>
              <button type="button" onClick={() => pick(null)} aria-label="Remove screenshot" className="grid size-9 shrink-0 place-items-center rounded-full text-warm/60 hover:bg-warm/10 hover:text-warm">
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ) : (
            <label
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
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lavender has-[:focus-visible]:outline-solid",
                dragging ? "border-sunset bg-sunset/[0.06]" : "border-warm/20 hover:border-sunset/60",
              )}
            >
              <span aria-hidden className="grid size-11 place-items-center rounded-full bg-warm/6 text-warm/60">
                <ImagePlus className="size-5" />
              </span>
              <span className="font-medium">Choose a screenshot or drop it here</span>
              <span className="text-xs text-warm/50">Show the amount, the receiving address and the transaction hash if you can.</span>
            </label>
          )}
          <input
            ref={fileInput}
            type="file"
            aria-required="true"
            accept="image/png,image/jpeg,image/webp"
            aria-labelledby="shot-label"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <label className="grid gap-2 text-sm">
          <span className="text-warm/70">
            Message <span className="text-warm/45">(optional)</span>
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Anything we should know about this payment"
            className="w-full rounded-xl border border-warm/14 bg-obsidian/60 px-4 py-3 text-[0.9375rem] text-warm placeholder:text-warm/35 focus:border-sunset/70 focus:outline-none"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-vice/10 px-4 py-3 text-sm text-[#ff9fc4]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="mt-6 inline-flex h-15 w-full items-center justify-center gap-2.5 rounded-control bg-[linear-gradient(100deg,var(--color-vice)_0%,#ff7a7c_45%,var(--color-sunset)_100%)] bg-[length:140%_100%] bg-left font-semibold text-obsidian transition-[background-position] duration-500 hover:bg-right disabled:opacity-60"
      >
        <Send aria-hidden className="size-4.5" />
        {busy ? "Submitting…" : "Submit payment for verification"}
      </button>
      <p className="mt-3 text-center text-xs text-warm/45">A screenshot alone is not proof of payment. We confirm every transfer on the blockchain.</p>
    </form>
  );
}

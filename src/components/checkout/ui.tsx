"use client";

import { Check, Copy, FlaskConical } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { encodeQr, qrPath } from "@/lib/qr";
import { cn } from "@/lib/utils";

/** Copies a value and confirms in place (announced to screen readers). */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          setDone(false);
        }
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3.5 text-xs font-semibold transition-colors duration-300",
        done ? "bg-[#1f3d2f] text-[#7be3ae]" : "bg-warm/10 text-warm hover:bg-warm/18",
        className,
      )}
    >
      {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : <Copy aria-hidden className="size-3.5" />}
      <span aria-live="polite">{done ? "Copied" : "Copy"}</span>
      <span className="sr-only"> {label}</span>
    </button>
  );
}

/** Marks test orders and test data. */
export function TestBadge() {
  return <span className="rounded-control border border-[#ffd400]/40 px-2 py-0.5 font-sans text-[0.6875rem] font-semibold tracking-normal text-[#ffe680]">Test order</span>;
}

/** Persistent, unmistakable marker that nothing here is real. */
export function PreviewBanner({ children }: { children: ReactNode }) {
  return (
    <div role="note" data-checkout-preview className="flex items-start gap-3 rounded-xl border border-[#ffd400]/30 bg-[#ffd400]/[0.07] px-4 py-3 text-sm text-[#ffe680]">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/** A labelled, monospaced value row with a copy action (address, amount, IDs). */
export function ValueRow({ label, value, display, mono = true }: { label: string; value: string; display?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-xs text-warm/50">{label}</p>
        <p className={cn("mt-1 break-all text-warm", mono && "font-mono text-[0.9375rem] tracking-tight")}>{display ?? value}</p>
      </div>
      <CopyButton value={value} label={label} />
    </div>
  );
}

/**
 * A scannable QR code (rendered locally from `value`, nothing sent anywhere). Dark modules on
 * a white card with the standard 4-module quiet zone, so any wallet camera can read it.
 */
export function PaymentQr({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = useMemo(() => encodeQr(value), [value]);
  const n = qr.size + 8;
  return (
    <div className={cn("relative rounded-2xl bg-white p-2", className)}>
      <svg viewBox={`-4 -4 ${n} ${n}`} className="block size-full" shapeRendering="crispEdges" role="img" aria-label={label} data-qr-value={value}>
        <path d={qrPath(qr)} fill="#08080d" />
      </svg>
    </div>
  );
}

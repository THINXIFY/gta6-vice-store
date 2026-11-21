"use client";

import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePageHref } from "@/components/ContentProvider";

const TOPICS = [
  { id: "order", label: "An order" },
  { id: "payment", label: "A payment" },
  { id: "delivery", label: "Game delivery" },
  { id: "refund", label: "A refund" },
  { id: "other", label: "Something else" },
];

const field =
  "h-12 w-full rounded-xl border border-warm/12 bg-obsidian/70 px-4 text-[0.9375rem] text-warm placeholder:text-warm/30 transition-colors hover:border-warm/25 focus:border-sunset/70 focus:ring-3 focus:ring-sunset/15 focus:outline-none aria-[invalid=true]:border-vice/70";
const labelCls = "grid gap-2 text-sm font-medium text-warm/80";

/** Contact form → POST /api/support. Works with keyboard and screen readers; errors are announced. */
export function ContactForm({ preview }: { preview: boolean }) {
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string; reference?: string }>({ status: "idle" });
  const privacy = usePageHref()("privacy");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = (await res.json()) as { reference?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Your message could not be sent. Please try again.");
      setState({ status: "sent", reference: json.reference });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Your message could not be sent. Please try again." });
    }
  }

  if (state.status === "sent") {
    return (
      <div role="status" className="grid justify-items-start gap-3 rounded-media border border-success/25 bg-success/[0.06] p-6 sm:p-8">
        <CheckCircle2 aria-hidden className="size-7 text-success-soft" />
        <h2 className="text-title font-semibold">Message sent</h2>
        <p className="text-warm/75">
          Your reference is <span className="font-mono text-warm">{state.reference}</span>. We have emailed you a confirmation and will reply to the address you gave.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate={false} className="grid gap-5 rounded-media border border-warm/10 bg-midnight/60 p-6 sm:p-8">
      {preview && <p className="rounded-lg bg-warning/[0.08] px-3 py-2 text-xs text-warning-soft">Preview: messages are saved as test messages.</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelCls}>
          Your name <span className="text-xs font-normal text-warm/45">Optional</span>
          <input name="name" autoComplete="name" maxLength={120} className={field} />
        </label>
        <label className={labelCls}>
          Email
          <input name="email" type="email" required autoComplete="email" maxLength={254} className={field} />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelCls}>
          Your message is about
          <select name="topic" required defaultValue="" className={`${field} appearance-none`}>
            <option value="" disabled>
              Choose a topic
            </option>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Payment ID <span className="text-xs font-normal text-warm/45">If you have an order</span>
          <input name="paymentId" placeholder="VICE-7K2M9QXR" maxLength={13} pattern="[Vv][Ii][Cc][Ee]-[0-9A-Za-z]{8}" autoCapitalize="characters" className={`${field} font-mono uppercase placeholder:normal-case`} />
        </label>
      </div>
      <label className={labelCls}>
        Message
        <textarea name="message" required minLength={10} maxLength={4000} rows={6} className={`${field} h-auto py-3 leading-relaxed`} />
      </label>
      {/* Spam trap: hidden from people and assistive technology. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.status === "error" && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-vice/10 px-3 py-2.5 text-sm text-danger-soft">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[26rem] text-xs leading-relaxed text-warm/50">
          We use your details only to reply to you.{" "}
          {privacy && (
            <>
              See our{" "}
              <Link href={privacy} className="underline underline-offset-4 hover:text-warm">
                Privacy Policy
              </Link>
              . Never include passwords, private keys or recovery phrases.
            </>
          )}
        </p>
        <button
          disabled={state.status === "sending"}
          className="inline-flex h-12 items-center gap-2 rounded-control bg-warm px-6 text-sm font-semibold text-obsidian transition-colors hover:bg-white disabled:opacity-60"
        >
          <Send aria-hidden className="size-4" />
          {state.status === "sending" ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

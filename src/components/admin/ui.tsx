import { AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { statusInfo, type OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

/** Admin UI kit: compact, calm styling on violet-tinted surfaces derived from the site's dark palette. */

export const input =
  "h-10 w-full rounded-lg border border-line-strong bg-well px-3 text-sm text-warm placeholder:text-warm/30 transition-colors hover:border-lavender/30 focus:border-vice/70 focus:ring-3 focus:ring-vice/15 focus:outline-none disabled:opacity-50";
export const label = "grid gap-1.5 text-xs font-medium text-warm/65";

const TONES: Record<OrderStatus, string> = {
  awaiting_payment: "bg-warm/8 text-warm/70",
  payment_submitted: "bg-sunset/15 text-sunset",
  under_review: "bg-lavender/15 text-lavender",
  info_required: "bg-[#ffd400]/15 text-[#ffe680]",
  payment_verified: "bg-[#7be3ae]/15 text-[#7be3ae]",
  game_ready: "bg-[#7be3ae]/20 text-[#9ef0c4]",
  payment_rejected: "bg-vice/15 text-[#ff9fc4]",
  order_expired: "bg-warm/6 text-warm/45",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", TONES[status])}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {statusInfo[status].label}
    </span>
  );
}

export function TestPill() {
  return <span className="rounded-full border border-[#ffd400]/35 px-2 py-0.5 text-[0.6875rem] font-semibold text-[#ffe680]">Test</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-1">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-warm/55">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-panel shadow-[0_1px_0_0_rgb(255_244_235/0.03)_inset]", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm", error ? "bg-vice/10 text-[#ff9fc4]" : "bg-[#7be3ae]/10 text-[#9ef0c4]")}
    >
      {error ? <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />}
      {error ?? ok}
    </p>
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" | "success" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vice disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-warm text-obsidian hover:bg-white",
        variant === "secondary" && "border border-line-strong bg-panel-2 text-warm hover:border-lavender/35 hover:bg-[#231b2e]",
        variant === "danger" && "bg-vice/15 text-[#ff9fc4] hover:bg-vice/25",
        variant === "success" && "bg-[#7be3ae] text-obsidian hover:bg-[#93ebbd]",
        className,
      )}
    />
  );
}

export function Field({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-warm/50">{k}</dt>
      <dd className={cn("min-w-0 break-all", mono && "font-mono text-[0.8125rem]")}>{v ?? <span className="text-warm/30">—</span>}</dd>
    </div>
  );
}

export const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const when = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—");

export const select = `${input} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23fff4eb' stroke-opacity='.5' stroke-width='1.6'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")] bg-[position:right_0.75rem_center] bg-no-repeat pr-8`;

/** One divided strip of figures instead of a row of separate cards. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; hint?: string; tone?: "action" | "good" | "bad" | "info"; href?: string }[] }) {
  const tones = { action: "text-sunset", good: "text-[#9ef0c4]", bad: "text-[#ff8fbb]", info: "text-lavender" };
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-panel sm:grid-cols-3 xl:grid-cols-6">
      {items.map((s) => {
        const body = (
          <>
            <dt className="text-xs font-medium text-warm/55">{s.label}</dt>
            <dd className={cn("mt-2 text-[1.625rem] leading-none font-semibold tabular-nums", s.tone && tones[s.tone])}>{s.value}</dd>
            {s.hint && <dd className="mt-1.5 text-xs text-warm/45">{s.hint}</dd>}
          </>
        );
        const cls = "-mr-px -mb-px block border-r border-b border-line p-4 sm:p-5";
        return s.href ? (
          <Link key={s.label} href={s.href} className={cn(cls, "transition-colors hover:bg-panel-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-vice")}>
            {body}
          </Link>
        ) : (
          <div key={s.label} className={cls}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}

/** Link-based segmented control (works without JavaScript). */
export function Segmented({ label: name, options }: { label: string; options: { href: string; label: ReactNode; active: boolean }[] }) {
  return (
    <nav aria-label={name} className="inline-flex rounded-lg border border-line bg-well p-0.5">
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", o.active ? "bg-panel-2 text-warm shadow-[0_0_0_1px_var(--color-line-strong)]" : "text-warm/55 hover:text-warm")}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-panel-2 text-warm/50">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-warm/55">{children}</div>}
    </div>
  );
}

export function Pagination({ page, pages, total, perPage, href }: { page: number; pages: number; total: number; perPage: number; href: (p: number) => string }) {
  if (!total) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages])).filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const btn = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-semibold tabular-nums transition-colors";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-xs text-warm/55">
      <p className="tabular-nums">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? <Link href={href(page - 1)} className={cn(btn, "hover:bg-panel-2 hover:text-warm")}>Previous</Link> : <span className={cn(btn, "text-warm/25")}>Previous</span>}
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1]! > 1 && <span aria-hidden>…</span>}
            <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={cn(btn, n === page ? "bg-panel-2 text-warm shadow-[0_0_0_1px_var(--color-line-strong)]" : "hover:bg-panel-2 hover:text-warm")}>
              {n}
            </Link>
          </span>
        ))}
        {page < pages ? <Link href={href(page + 1)} className={cn(btn, "hover:bg-panel-2 hover:text-warm")}>Next</Link> : <span className={cn(btn, "text-warm/25")}>Next</span>}
      </div>
    </nav>
  );
}

/** Relative age, for queues ("12 min", "3 h", "2 d"). */
export function age(d: Date | string | null | undefined) {
  if (!d) return "—";
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60_000));
  return m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
}

export const EMAIL_LABELS: Record<string, string> = {
  order_created: "Order created",
  payment_submitted: "Payment submitted",
  payment_approved: "Payment approved",
  payment_rejected: "Payment rejected",
  info_required: "Information required",
  game_ready: "Game ready",
  admin_submission: "Admin alert: payment to review",
  support_received: "Support: message received",
  admin_support: "Admin alert: support message",
  test: "Test email",
};

/** Owner-only retry for a failed email (server action passed in to keep this file server-safe). */
export function RetryButton({ id, back, action }: { id: string; back: string; action: (f: FormData) => Promise<void> }) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button className="rounded-md border border-line-strong px-2 py-0.5 text-[0.6875rem] font-semibold text-warm/80 transition-colors hover:border-lavender/40 hover:text-warm">Retry</button>
    </form>
  );
}

const EMAIL_TONES: Record<string, string> = {
  sent: "bg-[#7be3ae]/15 text-[#9ef0c4]",
  failed: "bg-vice/15 text-[#ff9fc4]",
  skipped: "bg-warm/8 text-warm/60",
  pending: "bg-sunset/15 text-sunset",
};

export function EmailStatus({ status }: { status: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold capitalize", EMAIL_TONES[status])}>{status}</span>;
}

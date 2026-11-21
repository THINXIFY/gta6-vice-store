import { ArrowRight, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { launchChecks, type Check } from "@/server/launch";

export const metadata = { title: "Launch checklist" };

const GROUPS: Check["group"][] = ["Business", "Store", "Payments and delivery", "Infrastructure", "Security"];

/**
 * Admin → Launch checklist (WL-6): everything a store needs before taking real orders, checked
 * live against this deployment. Required items block a safe launch; the rest are recommended.
 */
export default async function Launch() {
  await requireAdmin("owner");
  const checks = await launchChecks();
  const required = checks.filter((c) => c.required);
  const ready = required.filter((c) => c.ok).length;
  const pct = Math.round((ready / required.length) * 100);
  const done = ready === required.length;

  return (
    <div className="grid gap-5">
      <PageHeader title="Launch checklist" description="What this store needs before it takes real orders, checked live against this deployment." />

      <section aria-label="Progress" className={cn("rounded-2xl border p-5", done ? "border-success/30 bg-success/[0.05]" : "border-line bg-panel")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-lg font-semibold">{done ? "Ready to take real orders." : `${ready} of ${required.length} required items ready`}</p>
          <p className="text-sm text-warm/55">{checks.filter((c) => !c.required && !c.ok).length} recommended items open</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-well" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Required items ready">
          <div className={cn("h-full rounded-full", done ? "bg-success" : "bg-[linear-gradient(90deg,var(--color-vice),var(--color-sunset))]")} style={{ width: `${pct}%` }} />
        </div>
      </section>

      {GROUPS.map((g) => {
        const items = checks.filter((c) => c.group === g);
        if (!items.length) return null;
        return (
          <Card key={g} title={g}>
            <ul className="divide-y divide-line">
              {items.map((c) => {
                const Icon = c.ok ? CheckCircle2 : c.required ? XCircle : CircleDashed;
                return (
                  <li key={c.id} data-check={c.id} data-ok={c.ok} className="flex flex-wrap items-start gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-nowrap">
                    <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", c.ok ? "text-success" : c.required ? "text-danger-soft" : "text-warning-soft")} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {c.title}
                        <span className="sr-only">{c.ok ? "(done)" : "(open)"}</span>
                        {!c.required && <span className="rounded-full bg-warm/8 px-2 py-0.5 text-[0.6875rem] font-medium text-warm/55">Recommended</span>}
                      </p>
                      <p className="mt-0.5 text-sm break-words text-warm/60">{c.detail}</p>
                    </div>
                    {!c.ok &&
                      (c.fix.href ? (
                        <Link href={c.fix.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-panel-2 px-3 py-1.5 text-xs font-semibold text-warm hover:border-lavender/35">
                          {c.fix.label} <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      ) : (
                        <code className="shrink-0 rounded-lg bg-well px-2.5 py-1.5 font-mono text-xs text-warm/70">{c.fix.label}</code>
                      ))}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
      <p className="text-xs text-warm/45">Server settings (environment variables) are described in .env.example and docs/deploy.md. Secret values are never shown here.</p>
    </div>
  );
}

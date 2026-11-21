import { CheckCircle2, Inbox, Mail, RotateCcw } from "lucide-react";
import Link from "next/link";
import { EmptyState, Flash, PageHeader, Segmented, TestPill, when } from "@/components/admin/ui";
import { requireAdmin } from "@/server/auth";
import { listSupport, SUPPORT_TOPICS, type SupportTopic } from "@/server/support";
import { supportStatusAction } from "../../actions";

export const metadata = { title: "Support" };

type Search = Promise<{ view?: string; id?: string; ok?: string; error?: string }>;

export default async function SupportPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin(); // never rely on the layout alone for auth
  const sp = await searchParams;
  const view = sp.view === "resolved" || sp.view === "all" ? sp.view : "open";
  const { rows, counts } = await listSupport(view);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Support"
        description="Messages from the contact form. Reply by email, then mark them resolved."
        actions={
          <Segmented
            label="Message status"
            options={[
              { href: "/admin/support", label: `Open (${counts.open})`, active: view === "open" },
              { href: "/admin/support?view=resolved", label: `Resolved (${counts.resolved})`, active: view === "resolved" },
              { href: "/admin/support?view=all", label: "All", active: view === "all" },
            ]}
          />
        }
      />
      <Flash ok={sp.ok} error={sp.error} />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel">
          <EmptyState icon={view === "open" ? CheckCircle2 : Inbox} title={view === "open" ? "No open messages" : "No messages here"}>
            Messages sent through the contact page appear here, oldest open message first.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((m) => (
            <li key={m.id} id={m.id} className={`rounded-2xl border bg-panel p-5 ${sp.id === m.id ? "border-lavender/50" : "border-line"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-[0.8125rem] text-sunset">{m.reference}</span>
                    <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs text-warm/70">{SUPPORT_TOPICS[m.topic as SupportTopic] ?? m.topic}</span>
                    {m.status === "resolved" && <span className="rounded-full bg-[#7be3ae]/15 px-2 py-0.5 text-xs font-semibold text-[#9ef0c4]">Resolved</span>}
                    {m.isTest && <TestPill />}
                  </p>
                  <p className="mt-2 font-medium">
                    {m.name ? `${m.name} · ` : ""}
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message ${m.reference}`)}`} className="text-warm/85 underline-offset-4 hover:underline">
                      {m.email}
                    </a>
                  </p>
                  {m.paymentId && (
                    <Link href={`/admin/orders/${m.paymentId}`} className="mt-1 inline-block font-mono text-xs text-warm/60 hover:text-sunset">
                      Order {m.paymentId}
                    </Link>
                  )}
                </div>
                <p className="text-xs text-warm/45">{when(m.createdAt)}</p>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed whitespace-pre-line text-warm/80">{m.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message ${m.reference}`)}`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-warm px-3.5 text-sm font-semibold text-obsidian hover:bg-white"
                >
                  <Mail aria-hidden className="size-4" />
                  Reply by email
                </a>
                <form action={supportStatusAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={m.status === "open" ? "resolved" : "open"} />
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-panel-2 px-3.5 text-sm font-semibold hover:border-lavender/35">
                    {m.status === "open" ? <CheckCircle2 aria-hidden className="size-4 text-[#9ef0c4]" /> : <RotateCcw aria-hidden className="size-4" />}
                    {m.status === "open" ? "Mark resolved" : "Reopen"}
                  </button>
                </form>
                {m.resolvedBy && (
                  <span className="text-xs text-warm/45">
                    Resolved by {m.resolvedBy.replace(/^admin:/, "")} {when(m.resolvedAt)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

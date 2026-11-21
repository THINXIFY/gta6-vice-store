import { ExternalLink, MailX, Send } from "lucide-react";
import { Button, Card, EMAIL_LABELS, EmailStatus, EmptyState, Field, Flash, input, label, PageHeader, RetryButton, when } from "@/components/admin/ui";
import { checkoutOpen } from "@/lib/checkout";
import { requireAdmin } from "@/server/auth";
import { emailIdentity, emailLog, emailSettings } from "@/server/email";
import { getContent } from "@/server/content";
import { retryEmailAction, emailIdentityAction, testEmailAction } from "../../actions";

export const metadata = { title: "Emails" };

const PREVIEWS = ["order_created", "payment_submitted", "payment_approved", "payment_rejected", "info_required", "game_ready", "admin_submission", "support_received", "admin_support"];

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAdmin();
  const flash = await searchParams;
  const cfg = emailSettings();
  const [log, id, { email: saved }] = await Promise.all([emailLog({ limit: 100 }), emailIdentity(), getContent()]);
  const modeText =
    cfg.mode === "live"
      ? "Live: emails go to customers."
      : cfg.mode === "off"
        ? "Off: emails are logged, not sent."
        : cfg.testRecipient
          ? `Test: every email is redirected to ${cfg.testRecipient}.`
          : "Test: emails are logged, not sent. Set EMAIL_TEST_RECIPIENT to receive copies.";

  return (
    <div className="grid gap-6">
      <PageHeader title="Emails" description="Order emails, admin alerts and the delivery log. Each email is sent at most once per event." />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card title="Configuration">
          <dl className="divide-y divide-line">
            <Field k="Mode" v={modeText} />
            {cfg.liveRequested && !checkoutOpen && <Field k="Note" v="EMAIL_MODE=live is ignored while live checkout is disabled." />}
            <Field k="SMTP server" v={cfg.smtp ? `${cfg.smtp.host}:${cfg.smtp.port} (${cfg.smtp.security === "none" ? "unencrypted, local only" : cfg.smtp.security.toUpperCase()})${cfg.smtp.user ? ", authenticated" : ""}` : "Not configured (SMTP_HOST)"} />
            <Field k="From" v={id.from || "Not set (EMAIL_FROM)"} />
            <Field k="Reply-to" v={id.replyTo} />
            <Field k="Admin alerts" v={id.adminNotify.length ? id.adminNotify.join(", ") : "All active owners"} />
          </dl>
          <p className="mt-4 text-xs text-warm/45">The mail server, the From address and passwords come from server environment variables (see .env.example) and are never shown or edited here.</p>
          {me.role === "owner" && (
            <form action={emailIdentityAction} className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <p className="text-sm font-semibold sm:col-span-2">Sender</p>
              <label className={label}>
                Sender name
                <input name="fromName" defaultValue={saved.fromName} placeholder={id.name} className={input} />
              </label>
              <label className={label}>
                Reply-to address
                <input name="replyTo" type="email" defaultValue={saved.replyTo} placeholder={cfg.replyTo || "Same as the From address"} className={input} />
              </label>
              <label className={`${label} sm:col-span-2`}>
                Admin alert recipients (comma separated; empty = all active owners)
                <input name="adminNotify" defaultValue={saved.adminNotify.join(", ")} placeholder={cfg.adminNotify.join(", ") || "owner@example.com, support@example.com"} className={input} />
              </label>
              <div className="sm:col-span-2">
                <Button variant="secondary">Save sender settings</Button>
              </div>
            </form>
          )}
        </Card>

        <div className="grid content-start gap-6">
          {me.role === "owner" && (
            <Card title="Send a test email">
              <form action={testEmailAction} className="grid gap-3">
                <label className={label}>
                  Send to
                  <input name="to" type="email" required defaultValue={me.email} className={input} />
                </label>
                <Button variant="secondary">
                  <Send aria-hidden className="size-4" />
                  Send test email
                </Button>
              </form>
            </Card>
          )}
          <Card title="Templates">
            <ul className="grid gap-1 text-sm">
              {PREVIEWS.map((k) => (
                <li key={k}>
                  <a href={`/admin/emails/preview/${k}`} target="_blank" rel="noopener" className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-warm/80 hover:bg-panel-2 hover:text-warm">
                    {EMAIL_LABELS[k]}
                    <ExternalLink aria-hidden className="size-3.5 text-warm/40" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <section aria-labelledby="log" className="rounded-2xl border border-line bg-panel">
        <h2 id="log" className="border-b border-line px-5 py-4 text-[0.9375rem] font-semibold">
          Delivery log
        </h2>
        {log.length === 0 ? (
          <EmptyState icon={MailX} title="No emails yet">
            Emails are logged here when orders are created, paid, reviewed and released.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="text-left text-xs text-warm/50">
                <tr className="border-b border-line bg-panel-2">
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Recipient</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {log.map((m) => (
                  <tr key={m.id} className="border-t border-line/70 align-top first:border-0">
                    <td className="px-5 py-3">
                      <span className="block font-medium">{EMAIL_LABELS[m.kind] ?? m.kind}</span>
                      <span className="block max-w-[28rem] truncate text-xs text-warm/45">{m.subject}</span>
                    </td>
                    <td className="px-3 py-3 text-warm/75">
                      {m.recipient}
                      {m.deliveredTo && <span className="block text-xs text-warm/45">Test copy to {m.deliveredTo}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <EmailStatus status={m.status} />
                        {m.status === "failed" && me.role === "owner" && <RetryButton id={m.id} back="/admin/emails" action={retryEmailAction} />}
                      </span>
                      {m.error && m.status !== "sent" && <span className="mt-1 block max-w-[18rem] text-xs text-warm/45">{m.error}</span>}
                      {m.attempts > 1 && <span className="mt-1 block text-xs text-warm/40">{m.attempts} attempts</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-xs whitespace-nowrap text-warm/55">{when(m.sentAt ?? m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

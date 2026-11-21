import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScreenshotViewer } from "@/components/admin/ScreenshotViewer";
import { Button, Card, EMAIL_LABELS, EmailStatus, Field, RetryButton, Flash, input, label, StatusBadge, TestPill, usd, when } from "@/components/admin/ui";
import { networks, type NetworkId } from "@/config/payments";
import { editions, platforms } from "@/config/product";
import { networkLabel } from "@/lib/orders/methods";
import { statusInfo } from "@/lib/orders/types";
import { CHECKLIST, orderDetail } from "@/server/admin";
import { retryEmailAction, reviewAction } from "../../../actions";
import { requireAdmin } from "@/server/auth";
import { emailLog } from "@/server/email";

export const metadata = { title: "Order" };

type Props = { params: Promise<{ paymentId: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const me = await requireAdmin(); // never rely on the layout alone for auth
  const [{ paymentId }, flash] = await Promise.all([params, searchParams]);
  const data = await orderDetail(paymentId);
  if (!data) notFound();
  const { order: o, submissions, history, fulfillment, auditTrail, inventoryAvailable } = data;
  const emails = await emailLog({ orderId: o.id });
  const net = networks[o.network as NetworkId];
  const latest = submissions[0];
  const reviewable = o.status === "payment_submitted" || o.status === "under_review";
  const canReject = reviewable || o.status === "info_required";

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-warm/55 hover:text-warm">
          <ArrowLeft aria-hidden className="size-4" />
          Orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{o.paymentId}</h1>
          <StatusBadge status={o.status} />
          {o.isTest && <TestPill />}
        </div>
        <p className="mt-1 text-sm text-warm/50">
          {o.reference} · created {when(o.createdAt)}
        </p>
      </div>
      <Flash ok={flash.ok} error={flash.error} />

      {/* The three amounts a reviewer compares, side by side. */}
      <dl className="grid overflow-hidden rounded-2xl border border-line bg-panel sm:grid-cols-3">
        {[
          { k: "Expected", v: o.cryptoAmount, sub: `${usd(o.usdCents)} at the locked rate`, tone: "" },
          { k: "Customer reported", v: latest?.claimedAmount, sub: latest ? (latest.claimedAmount === o.cryptoAmount ? "Matches the expected amount" : "Differs from the expected amount") : "Not submitted yet", tone: latest && latest.claimedAmount !== o.cryptoAmount ? "text-sunset" : "" },
          { k: "Verified on-chain", v: o.verifiedAmount, sub: o.verifiedAmount ? "Confirmed by a reviewer" : "Set when you approve", tone: "text-[#9ef0c4]" },
        ].map((a) => (
          <div key={a.k} className="-mr-px -mb-px border-r border-b border-line p-4 sm:p-5">
            <dt className="text-xs font-medium text-warm/55">{a.k}</dt>
            <dd className={`mt-2 font-mono text-lg font-semibold break-all ${a.v ? a.tone : "text-warm/30"}`}>{a.v ? `${a.v} ${o.asset}` : "—"}</dd>
            <dd className={`mt-1 text-xs ${a.tone && a.v ? a.tone : "text-warm/45"}`}>{a.sub}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid content-start gap-6">
          <Card title="Payment">
            <dl className="divide-y divide-line">
              <Field k="USD price" v={usd(o.usdCents)} />
              <Field k="Network" v={networkLabel(o.network as NetworkId)} />
              <Field
                k="Receiving address"
                v={
                  <a href={net.addressExplorer.replace("{addr}", o.address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-sunset hover:underline">
                    <span className="break-all">{o.address}</span>
                    <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    <span className="sr-only">(open address in block explorer)</span>
                  </a>
                }
                mono
              />
              <Field k="Locked rate" v={`1 ${o.asset} = ${Number(o.rate).toLocaleString("en-US", { maximumFractionDigits: 8 })}${o.rateIsPreview ? " (preview rate)" : o.rateSource ? ` via ${o.rateSource}` : ""}`} />
              <Field k="Submitted within quote" v={latest ? (latest.createdAt <= o.quoteExpiresAt ? "Yes" : "No, after the quote expired") : null} />
              <Field k="TXID reuse" v={latest ? "Checked: a TXID can only be used once per network" : null} />
              <Field
                k="TXID"
                v={
                  latest ? (
                    <a href={net.explorer.replace("{tx}", latest.txid)} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-sunset hover:underline">
                      <span className="break-all">{latest.txid}</span>
                      <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      <span className="sr-only">(open in block explorer)</span>
                    </a>
                  ) : null
                }
                mono
              />
              <Field k="Required confirmations" v={net.confirmations} />
              <Field k="Customer message" v={latest?.message} />
            </dl>
          </Card>

          <Card title="Payment screenshot">
            {latest?.purgedAt ? (
              <p className="text-sm text-warm/50">Deleted under the retention policy on {when(latest.purgedAt)}. Size and fingerprint are kept in the record.</p>
            ) : latest?.screenshotId ? (
              <ScreenshotViewer
                src={`/admin/screenshots/${latest.screenshotId}`}
                alt={`Payment screenshot for ${o.paymentId}`}
                meta={`${latest.mime}, ${((latest.bytes ?? 0) / 1024).toFixed(0)} KB, uploaded ${when(latest.createdAt)}${submissions.length > 1 ? `. ${submissions.length} submissions in total.` : "."}`}
              />
            ) : (
              <p className="text-sm text-warm/50">No screenshot was uploaded.</p>
            )}
            <p className="mt-4 rounded-lg bg-panel-2 px-3 py-2 text-xs text-warm/55">A screenshot is never proof of payment. Verify the transaction on the blockchain before approving.</p>
          </Card>

          <Card title="Order">
            <dl className="divide-y divide-line">
              <Field k="Customer email" v={o.email} />
              <Field k="Account region" v={o.region} />
              <Field k="Edition" v={editions.find((e) => e.id === o.editionId)?.name} />
              <Field k="Platform" v={platforms.find((p) => p.id === o.platformId)?.name} />
              <Field k="Quote expires" v={when(o.quoteExpiresAt)} />
              <Field k="Submitted" v={latest ? when(latest.createdAt) : null} />
              <Field k="Fulfillment" v={fulfillment ? `${fulfillment.kind === "access_link" ? "Access link" : "Code"} ${fulfillment.hint} released ${when(fulfillment.assignedAt)}` : o.status === "payment_verified" ? "Awaiting release" : null} />
            </dl>
          </Card>

          <Card title="Emails" actions={<Link href="/admin/emails" className="text-xs text-sunset hover:underline">Email settings</Link>}>
            {emails.length === 0 ? (
              <p className="text-sm text-warm/50">No emails for this order yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {emails.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block font-medium">{EMAIL_LABELS[m.kind] ?? m.kind}</span>
                      <span className="block text-xs text-warm/45">
                        To {m.recipient}
                        {m.deliveredTo && ` (test copy to ${m.deliveredTo})`}
                        {m.error && m.status !== "sent" && ` · ${m.error}`}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-warm/45">
                      {m.status === "failed" && me.role === "owner" && <RetryButton id={m.id} back={`/admin/orders/${o.paymentId}`} action={retryEmailAction} />}
                      <EmailStatus status={m.status} />
                      {when(m.sentAt ?? m.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="History">
            <ol className="grid gap-3 text-sm">
              {history.map((h) => (
                <li key={h.id} className="grid grid-cols-[9rem_1fr] gap-3">
                  <span className="text-xs text-warm/45">{when(h.createdAt)}</span>
                  <span>
                    <span className="font-medium">{statusInfo[h.toStatus].label}</span> <span className="text-warm/45">by {h.actor}</span>
                    {h.note && <span className="block text-warm/60">{h.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
            <details className="mt-5 text-xs text-warm/50">
              <summary className="cursor-pointer">Audit log ({auditTrail.length})</summary>
              <ul className="mt-2 grid gap-1 font-mono">
                {auditTrail.map((a) => (
                  <li key={a.id}>
                    {when(a.createdAt)} · {a.actor} · {a.action}
                  </li>
                ))}
              </ul>
            </details>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid content-start gap-6 xl:sticky xl:top-6">
          {o.status === "payment_submitted" && (
            <form action={reviewAction}>
              <input type="hidden" name="paymentId" value={o.paymentId} />
              <Button name="action" value="start_review" variant="secondary" className="w-full">
                Start review
              </Button>
            </form>
          )}

          {reviewable && (
            <Card title="Approve payment">
              <form action={reviewAction} className="grid gap-4">
                <input type="hidden" name="paymentId" value={o.paymentId} />
                <fieldset className="grid gap-2">
                  <legend className="mb-1 flex items-center gap-2 text-xs font-medium text-warm/60">
                    <ShieldCheck aria-hidden className="size-4 text-sunset" />
                    Verified on the blockchain
                  </legend>
                  {CHECKLIST.map((c) => (
                    <label key={c.id} className="flex items-start gap-2.5 text-sm">
                      <input type="checkbox" name="checklist" value={c.id} required className="mt-0.5 size-4 accent-[#ff9b62]" />
                      {c.label}
                    </label>
                  ))}
                </fieldset>
                <label className={label}>
                  Amount received on-chain ({o.asset})
                  <input name="verifiedAmount" required inputMode="decimal" placeholder={o.cryptoAmount} className={`${input} font-mono`} />
                </label>
                <Button name="action" value="approve" variant="success">
                  Approve payment
                </Button>
              </form>
            </Card>
          )}

          {canReject && (
            <Card title="Request info or reject">
              <form action={reviewAction} className="grid gap-3">
                <input type="hidden" name="paymentId" value={o.paymentId} />
                <label className={label}>
                  Message to the customer
                  <textarea name="customerNote" required rows={3} maxLength={1000} className="w-full rounded-lg border border-line-strong bg-well px-3 py-2 text-sm focus:border-vice/70 focus:ring-3 focus:ring-vice/15 focus:outline-none" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {reviewable && (
                    <Button name="action" value="request_info" variant="secondary">
                      Request info
                    </Button>
                  )}
                  <Button name="action" value="reject" variant="danger" className={reviewable ? "" : "col-span-2"}>
                    Reject
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {o.status === "payment_verified" && me.role !== "owner" && (
            <Card title="Release game">
              <p className="text-sm text-warm/65">Payment verified. An owner releases the game to the customer.</p>
            </Card>
          )}
          {o.status === "payment_verified" && me.role === "owner" && (
            <Card title="Release game">
              <p className="text-sm text-warm/65">
                Assigns one {o.isTest ? "test " : ""}inventory item for this edition and platform and makes it visible to the customer. Available: {inventoryAvailable}.
              </p>
              <form action={reviewAction} className="mt-4">
                <input type="hidden" name="paymentId" value={o.paymentId} />
                <Button name="action" value="release" variant="primary" className="w-full" disabled={inventoryAvailable === 0}>
                  Release game to customer
                </Button>
              </form>
              {inventoryAvailable === 0 && (
                <Link href="/admin/fulfillment" className="mt-3 block text-xs text-sunset hover:underline">
                  Add inventory in Game Fulfillment
                </Link>
              )}
            </Card>
          )}

          <Card title="Admin notes">
            <form action={reviewAction} className="grid gap-3">
              <input type="hidden" name="paymentId" value={o.paymentId} />
              <textarea name="adminNote" defaultValue={o.adminNote ?? ""} rows={4} maxLength={2000} placeholder="Internal only. Never shown to the customer." className="w-full rounded-lg border border-line-strong bg-well px-3 py-2 text-sm focus:border-vice/70 focus:ring-3 focus:ring-vice/15 focus:outline-none" />
              <Button name="action" value="note" variant="secondary">
                Save note
              </Button>
            </form>
            {o.customerNote && <p className="mt-4 text-xs text-warm/50">Last message to customer: {o.customerNote}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

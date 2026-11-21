import Link from "next/link";
import { Button, Card, Flash, input, label, PageHeader, TestPill, when } from "@/components/admin/ui";
import { editionName, platformShortName } from "@/lib/catalog";
import { getCatalog } from "@/server/catalog";
import { listInventory } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { addInventoryAction, removeInventoryAction } from "../../actions";

export const metadata = { title: "Game Fulfillment" };

const select = `${input} appearance-none`;

export default async function Fulfillment({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const catalog = await getCatalog();
  const { editions, platforms } = catalog;
  await requireAdmin("owner");
  const [items, flash] = await Promise.all([listInventory(), searchParams]);
  const available = (e: string, p: string, test: boolean) => items.filter((i) => i.editionId === e && i.platformId === p && i.isTest === test && !i.assignedAt).length;

  return (
    <div className="grid gap-5">
      <PageHeader title="Game Fulfillment" description="Legitimately sourced redemption codes and authorised access links, encrypted at rest." />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {editions.flatMap((e) =>
          platforms.map((p) => (
            <div key={`${e.id}${p.id}`} className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-xs text-warm/50">
                {e.name} · {p.shortName}
              </p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums">{available(e.id, p.id, false)}</p>
              <p className="text-xs text-warm/40">available · {available(e.id, p.id, true)} test</p>
            </div>
          )),
        )}
      </div>

      <Card title="Add inventory">
        <form action={addInventoryAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className={label}>
            Edition
            <select name="editionId" className={select}>
              {editions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Platform
            <select name="platformId" className={select}>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Type
            <select name="kind" className={select}>
              <option value="redemption_code">Redemption code</option>
              <option value="access_link">Authorised access link (https)</option>
            </select>
          </label>
          <label className={`${label} md:col-span-2`}>
            Code or link
            <input name="secret" required autoComplete="off" spellCheck={false} className={`${input} font-mono`} />
          </label>
          <label className={label}>
            Region (optional)
            <input name="region" placeholder="e.g. US" className={input} />
          </label>
          <label className={`${label} md:col-span-2`}>
            Supplier or invoice reference
            <input name="sourceReference" required placeholder="Proves legitimate sourcing, e.g. supplier name + invoice number" className={input} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-warm/70">
            <input type="checkbox" name="isTest" defaultChecked className="size-4 accent-sunset" />
            Test item (for test orders only)
          </label>
          <div className="md:col-span-2 xl:col-span-3">
            <Button>Add to inventory</Button>
            <p className="mt-2 text-xs text-warm/45">Stored encrypted. Only the customer of an approved order can see it, and only after you release it.</p>
          </div>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-panel-2 text-left text-xs text-warm/45">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-3 py-3 font-medium">Product</th>
              <th className="px-3 py-3 font-medium">Source</th>
              <th className="px-3 py-3 font-medium">Assigned to</th>
              <th className="px-4 py-3 text-right font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-warm/50">
                  No inventory yet.
                </td>
              </tr>
            )}
            {items.map((i) => (
              <tr key={i.id} className="border-t border-line/70">
                <td className="px-4 py-3">
                  <span className="font-mono text-[0.8125rem]">{i.hint}</span> {i.isTest && <TestPill />}
                  <span className="block text-xs text-warm/45">{i.kind === "access_link" ? "Access link" : "Redemption code"}</span>
                </td>
                <td className="px-3 py-3">
                  {editionName(catalog, i.editionId).replace(" Edition", "")} · {platformShortName(catalog, i.platformId)}
                  {i.region && <span className="block text-xs text-warm/45">{i.region}</span>}
                </td>
                <td className="max-w-[14rem] truncate px-3 py-3 text-warm/65">{i.sourceReference}</td>
                <td className="px-3 py-3">
                  {i.paymentId ? (
                    <Link href={`/admin/orders/${i.paymentId}`} className="font-mono text-[0.8125rem] text-sunset hover:underline">
                      {i.paymentId}
                    </Link>
                  ) : (
                    <form action={removeInventoryAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <span className="text-xs text-warm/45">Available</span>{" "}
                      <button className="ml-2 text-xs text-danger-soft hover:underline">Remove</button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs text-warm/55">{when(i.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

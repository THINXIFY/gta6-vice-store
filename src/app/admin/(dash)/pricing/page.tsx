import { ChevronDown, Plus, Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card, Flash, input, label, PageHeader } from "@/components/admin/ui";
import { catalogAdmin } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { cn } from "@/lib/utils";
import { deleteEditionItemAction, editionAction, editionItemAction, platformEditAction, priceAction, productAction } from "../../actions";

export const metadata = { title: "Catalogue" };

const textarea = `${input} h-auto min-h-20 py-2 leading-relaxed`;
const check = "size-4 accent-sunset";

/** A collapsible editor row: summary line, then the form when opened. */
function Editor({ summary, children, open }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-line bg-panel-2/40 open:bg-panel-2/70">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-warm/45 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

function Status({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold", on ? "bg-success/12 text-success-soft" : "bg-warm/8 text-warm/50")}>{on ? onText : offText}</span>;
}

/**
 * Admin → Catalogue (WL-2): the product, its editions and platforms, prices, and what each
 * edition includes. The storefront, checkout, emails and admin read all of it from here.
 * Editions and platforms are hidden, never deleted, so past orders keep their names.
 */
export default async function Catalogue({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("owner");
  const [{ product, editions, platforms, prices, items }, flash] = await Promise.all([catalogAdmin(), searchParams]);
  const priceOf = (e: string, p: string) => prices.find((x) => x.editionId === e && x.platformId === p);
  const categories = [...new Set(items.map((i) => i.category))];
  const nextSort = (rows: { sort: number }[]) => (rows.length ? Math.max(...rows.map((r) => r.sort)) + 1 : 0);

  return (
    <div className="grid gap-5">
      <PageHeader title="Catalogue" description="What you sell. The storefront, checkout, emails and order pages all read it from here." />
      <Flash ok={flash.ok} error={flash.error} />

      {/* Product */}
      <Card title="Product">
        <form action={productAction} className="grid items-end gap-4 sm:grid-cols-[1fr_14rem_auto]">
          <label className={label}>
            Title
            <input name="title" required defaultValue={product?.title} className={input} />
          </label>
          <label className={label}>
            Short title
            <input name="shortTitle" defaultValue={product?.shortTitle} placeholder="e.g. GTA VI" className={input} />
          </label>
          <Button variant="secondary">Save</Button>
        </form>
      </Card>

      {/* Editions */}
      <Card title="Editions" actions={<span className="text-xs text-warm/45">Hidden editions keep their name on past orders.</span>}>
        <div className="grid gap-2.5">
          {editions.map((e) => (
            <Editor
              key={e.id}
              summary={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{e.name}</span>
                  {e.recommended && (
                    <span className="inline-flex items-center gap-1 text-xs text-sunset">
                      <Star aria-hidden className="size-3" /> Recommended
                    </span>
                  )}
                  <Status on={e.active} onText="On sale" offText="Hidden" />
                  <span className="truncate text-xs text-warm/45">{e.shortSummary}</span>
                </span>
              }
            >
              <EditionForm edition={e} />
            </Editor>
          ))}
          <Editor
            summary={
              <span className="inline-flex items-center gap-2 text-sm font-medium text-sunset">
                <Plus aria-hidden className="size-4" /> Add an edition
              </span>
            }
          >
            <EditionForm sort={nextSort(editions)} />
          </Editor>
        </div>
      </Card>

      {/* Prices */}
      <Card title="Prices (USD)">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="text-left text-xs text-warm/45">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-medium">Edition</th>
                {platforms.map((p) => (
                  <th key={p.id} className="px-3 py-2.5 font-medium">
                    {p.name} {!p.active && <span className="text-warm/35">(off)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editions.map((e) => (
                <tr key={e.id} className={cn("border-b border-line/70 last:border-0", !e.active && "opacity-55")}>
                  <td className="px-5 py-4 font-medium">
                    {e.name}
                    {!e.active && <span className="block text-xs font-normal text-warm/45">Hidden</span>}
                  </td>
                  {platforms.map((p) => {
                    const pr = priceOf(e.id, p.id);
                    return (
                      <td key={p.id} className="px-3 py-3">
                        <form action={priceAction} className="flex items-center gap-2">
                          <input type="hidden" name="editionId" value={e.id} />
                          <input type="hidden" name="platformId" value={p.id} />
                          <span className="text-warm/45">$</span>
                          <input
                            name="dollars"
                            required
                            inputMode="decimal"
                            defaultValue={pr ? (pr.amountCents / 100).toFixed(2) : ""}
                            placeholder="0.00"
                            className={`${input} w-24 font-mono`}
                            aria-label={`${e.name} price on ${p.name}`}
                          />
                          <label className="flex items-center gap-1.5 text-xs text-warm/60">
                            <input type="checkbox" name="active" defaultChecked={pr?.active ?? true} className={check} />
                            On sale
                          </label>
                          <Button variant="secondary" className="h-9 px-3">
                            Save
                          </Button>
                        </form>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-8 -mb-1 text-xs text-warm/45">An edition shows on a platform only once it has a price there that is on sale.</p>
      </Card>

      {/* Platforms */}
      <Card title="Platforms">
        <div className="grid gap-2.5">
          {platforms.map((p) => (
            <Editor
              key={p.id}
              summary={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{p.name}</span>
                  <Status on={p.active} onText="Available" offText="Off" />
                  {!p.redeemUrl && <span className="text-xs text-warning-soft">No redeem link yet</span>}
                </span>
              }
            >
              <PlatformForm platform={p} />
            </Editor>
          ))}
          <Editor
            summary={
              <span className="inline-flex items-center gap-2 text-sm font-medium text-sunset">
                <Plus aria-hidden className="size-4" /> Add a platform
              </span>
            }
          >
            <PlatformForm sort={nextSort(platforms)} />
          </Editor>
        </div>
      </Card>

      {/* Edition contents */}
      <Card title="What each edition includes" actions={<span className="text-xs text-warm/45">Shown in the edition comparison. Leave empty to hide it.</span>}>
        <datalist id="item-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="grid gap-2">
          <div className="hidden grid-cols-[10rem_1fr_auto_4.5rem_auto] gap-3 px-1 text-xs text-warm/45 lg:grid">
            <span>Category</span>
            <span>Item</span>
            <span>Included in</span>
            <span>Order</span>
            <span />
          </div>
          {items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line/60 p-2 lg:flex-nowrap lg:border-0 lg:p-0">
              <form action={editionItemAction} className="grid flex-1 items-center gap-3 lg:grid-cols-[10rem_1fr_auto_4.5rem_auto]">
                <input type="hidden" name="id" value={i.id} />
                <input name="category" required defaultValue={i.category} list="item-categories" aria-label="Category" className={input} />
                <input name="name" required defaultValue={i.name} aria-label="Item" className={input} />
                <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
                  <legend className="sr-only">Included in</legend>
                  {editions.map((e) => (
                    <label key={e.id} className="flex items-center gap-1.5 text-xs whitespace-nowrap text-warm/70">
                      <input type="checkbox" name="editionIds" value={e.id} defaultChecked={i.editionIds.includes(e.id)} className={check} />
                      {e.name.replace(/ Edition$/, "")}
                    </label>
                  ))}
                </fieldset>
                <input name="sort" inputMode="numeric" defaultValue={i.sort} aria-label="Order" className={`${input} font-mono`} />
                <Button variant="secondary" className="h-9 px-3">
                  Save
                </Button>
              </form>
              <form action={deleteEditionItemAction}>
                <input type="hidden" name="id" value={i.id} />
                <Button variant="danger" className="h-9 px-2.5" aria-label={`Remove ${i.name}`}>
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </form>
            </div>
          ))}
          <form action={editionItemAction} className="mt-2 grid items-center gap-3 rounded-lg border border-dashed border-line-strong p-3 lg:grid-cols-[10rem_1fr_auto_4.5rem_auto]">
            <input name="category" required list="item-categories" placeholder="Category" aria-label="New item category" className={input} />
            <input name="name" required placeholder="New item" aria-label="New item" className={input} />
            <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
              <legend className="sr-only">Included in</legend>
              {editions.map((e) => (
                <label key={e.id} className="flex items-center gap-1.5 text-xs whitespace-nowrap text-warm/70">
                  <input type="checkbox" name="editionIds" value={e.id} className={check} />
                  {e.name.replace(/ Edition$/, "")}
                </label>
              ))}
            </fieldset>
            <input name="sort" inputMode="numeric" defaultValue={nextSort(items)} aria-label="New item order" className={`${input} font-mono`} />
            <Button className="h-9 px-3">
              <Plus aria-hidden className="size-4" /> Add
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

type EditionRow = Awaited<ReturnType<typeof catalogAdmin>>["editions"][number];
type PlatformRow = Awaited<ReturnType<typeof catalogAdmin>>["platforms"][number];

function EditionForm({ edition: e, sort }: { edition?: EditionRow; sort?: number }) {
  return (
    <form action={editionAction} className="grid gap-4 sm:grid-cols-2">
      {e && <input type="hidden" name="id" value={e.id} />}
      <label className={label}>
        Name
        <input name="name" required defaultValue={e?.name} placeholder="e.g. Deluxe Edition" className={input} />
      </label>
      <label className={label}>
        Short line (pickers)
        <input name="shortSummary" defaultValue={e?.shortSummary} placeholder="e.g. Game + 5 extras" className={input} />
      </label>
      <label className={cn(label, "sm:col-span-2")}>
        Summary (purchase panel and comparison)
        <textarea name="summary" defaultValue={e?.summary} rows={2} className={textarea} />
      </label>
      <div className="flex flex-wrap items-end gap-5 sm:col-span-2">
        <label className={label}>
          Order
          <input name="sort" inputMode="numeric" defaultValue={e?.sort ?? sort ?? 0} className={`${input} w-20 font-mono`} />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm text-warm/75">
          <input type="checkbox" name="recommended" defaultChecked={e?.recommended} className={check} /> Recommended
        </label>
        <label className="flex h-10 items-center gap-2 text-sm text-warm/75">
          <input type="checkbox" name="active" defaultChecked={e?.active ?? true} className={check} /> On sale
        </label>
        <Button className="ml-auto">{e ? "Save edition" : "Add edition"}</Button>
      </div>
      {e && <p className="text-xs text-warm/40 sm:col-span-2">Id: {e.id} (used in links and orders; never changes)</p>}
    </form>
  );
}

function PlatformForm({ platform: p, sort }: { platform?: PlatformRow; sort?: number }) {
  return (
    <form action={platformEditAction} className="grid gap-4 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className={label}>
        Name
        <input name="name" required defaultValue={p?.name} placeholder="e.g. PlayStation 5" className={input} />
      </label>
      <label className={label}>
        Short name
        <input name="shortName" defaultValue={p?.shortName} placeholder="e.g. PS5" className={input} />
      </label>
      <label className={label}>
        Redeem button
        <input name="redeemLabel" defaultValue={p?.redeemLabel} placeholder="e.g. Redeem on PlayStation Store" className={input} />
      </label>
      <label className={label}>
        Redeem link (https)
        <input name="redeemUrl" type="url" defaultValue={p?.redeemUrl} placeholder="https://" className={input} />
      </label>
      <label className={cn(label, "sm:col-span-2")}>
        Redeem steps (one per line, shown with the code)
        <textarea name="redeemSteps" defaultValue={p?.redeemSteps.join("\n")} rows={3} className={textarea} />
      </label>
      <div className="flex flex-wrap items-end gap-5 sm:col-span-2">
        <label className={label}>
          Order
          <input name="sort" inputMode="numeric" defaultValue={p?.sort ?? sort ?? 0} className={`${input} w-20 font-mono`} />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm text-warm/75">
          <input type="checkbox" name="active" defaultChecked={p?.active ?? true} className={check} /> Available
        </label>
        <Button className="ml-auto">{p ? "Save platform" : "Add platform"}</Button>
      </div>
      {p && <p className="text-xs text-warm/40 sm:col-span-2">Id: {p.id} (used in links and orders; never changes)</p>}
    </form>
  );
}

import { Button, Card, Flash, input, PageHeader } from "@/components/admin/ui";
import { catalogAdmin } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { platformAction, priceAction } from "../../actions";

export const metadata = { title: "Products & Pricing" };

export default async function Pricing({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("owner");
  const [{ editions, platforms, prices }, flash] = await Promise.all([catalogAdmin(), searchParams]);
  const priceOf = (e: string, p: string) => prices.find((x) => x.editionId === e && x.platformId === p);

  return (
    <div className="grid gap-5">
      <PageHeader title="Products & Pricing" description="Prices are authoritative here; the storefront and checkout read them from the database." />
      <Flash ok={flash.ok} error={flash.error} />

      <Card title="Edition prices (USD)">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="text-left text-xs text-warm/45">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-medium">Edition</th>
                {platforms.map((p) => (
                  <th key={p.id} className="px-3 py-2.5 font-medium">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editions.map((e) => (
                <tr key={e.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 font-medium">{e.name}</td>
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
                            className={`${input} w-24 font-mono`}
                            aria-label={`${e.name} price on ${p.name}`}
                          />
                          <label className="flex items-center gap-1.5 text-xs text-warm/60">
                            <input type="checkbox" name="active" defaultChecked={pr?.active ?? true} className="size-4 accent-[#ff9b62]" />
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
      </Card>

      <Card title="Platform availability">
        <div className="grid gap-3 sm:grid-cols-2">
          {platforms.map((p) => (
            <form key={p.id} action={platformAction} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
              <input type="hidden" name="platformId" value={p.id} />
              <input type="hidden" name="active" value={p.active ? "false" : "true"} />
              <span className="text-sm">
                {p.name}
                <span className={`ml-2 text-xs ${p.active ? "text-[#9ef0c4]" : "text-warm/45"}`}>{p.active ? "Available" : "Hidden"}</span>
              </span>
              <Button variant="secondary" className="h-8 px-3 text-xs">
                {p.active ? "Disable" : "Enable"}
              </Button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}

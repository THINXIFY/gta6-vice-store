import { ChevronDown, KeyRound, Plus } from "lucide-react";
import { CoinIcon } from "@/components/checkout/CoinIcon";
import { Button, Card, Flash, input, PageHeader, select, TestPill } from "@/components/admin/ui";
import { assets, type AssetId, type NetworkId } from "@/config/payments";
import { checkoutOpen } from "@/lib/checkout";
import { networkLabel } from "@/lib/orders/methods";
import { cn } from "@/lib/utils";
import { listWallets } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { addWalletAction, walletAction } from "../../actions";

export const metadata = { title: "Wallets" };

type Row = Awaited<ReturnType<typeof listWallets>>[number];

/** What a method means for buyers right now. */
function status(w: Row): { label: string; tone: string } {
  if (!w.active) return { label: "Switched off", tone: "bg-warm/8 text-warm/50" };
  if (!w.isTest && w.validated && w.address) return checkoutOpen ? { label: "Taking payments", tone: "bg-success/12 text-success-soft" } : { label: "Ready (checkout closed)", tone: "bg-success/12 text-success-soft" };
  if (w.isTest) return { label: "Test only", tone: "bg-warning/12 text-warning-soft" };
  return { label: "Needs validation", tone: "bg-warning/12 text-warning-soft" };
}

function WalletForm({ w }: { w: Row }) {
  const s = status(w);
  return (
    <form action={walletAction} data-wallet={`${w.asset}:${w.network}`} className="grid items-end gap-4 rounded-2xl border border-line bg-panel p-4 lg:grid-cols-[13rem_minmax(0,1fr)_auto]">
      <input type="hidden" name="asset" value={w.asset} />
      <input type="hidden" name="network" value={w.network} />
      <div className="flex items-center gap-3">
        <CoinIcon asset={w.asset as AssetId} className="size-8 text-sm" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {w.asset} {w.isTest && <TestPill />}
          </p>
          <p className="truncate text-xs text-warm/50">{networkLabel(w.network as NetworkId)}</p>
          <span className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold", s.tone)}>{s.label}</span>
        </div>
      </div>
      <label className="grid gap-1.5 text-xs font-medium text-warm/60">
        Receiving address
        <input
          name="address"
          defaultValue={w.address}
          spellCheck={false}
          autoComplete="off"
          className={`${input} font-mono text-xs`}
          aria-label={`${w.asset} ${networkLabel(w.network as NetworkId)} receiving address`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-warm/70">
          <input type="checkbox" name="active" defaultChecked={w.active} className="size-4 accent-sunset" />
          Enabled
        </label>
        <label className="flex items-center gap-2 text-xs text-warm/70">
          <input type="checkbox" name="live" defaultChecked={!w.isTest} className="size-4 accent-sunset" />
          Live
        </label>
        <label className="flex items-center gap-2 text-xs text-warm/70">
          <input type="checkbox" name="validated" defaultChecked={w.validated} className="size-4 accent-sunset" />
          Validated
        </label>
        <Button variant="secondary" className="h-9">
          Save
        </Button>
      </div>
    </form>
  );
}

/**
 * Admin → Wallets (WL-5): the payment methods this store offers and their receiving addresses.
 * The only place addresses live (never in code). Checkout offers a method when it is enabled
 * and, for live orders, live with a validated, checksum-checked address.
 */
export default async function Wallets({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("owner");
  const [wallets, flash] = await Promise.all([listWallets(), searchParams]);
  const enabled = wallets.filter((w) => w.active);
  const off = wallets.filter((w) => !w.active);
  const listed = new Set(enabled.map((w) => `${w.asset}:${w.network}`));
  const addable = assets.flatMap((a) => a.networks.map((n) => ({ value: `${a.id}:${n.network}`, label: `${a.id} on ${networkLabel(n.network)}` }))).filter((o) => !listed.has(o.value));
  const taking = enabled.filter((w) => !w.isTest && w.validated && w.address).length;

  return (
    <div className="grid gap-5">
      <PageHeader title="Wallets" description="The payment methods you offer and the addresses buyers pay to. Public addresses only." />
      <p className="flex items-start gap-2.5 rounded-lg border border-vice/25 bg-vice/[0.06] px-4 py-3 text-sm text-danger-pale">
        <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0" />
        Never enter private keys or recovery phrases anywhere in this dashboard. Before marking an address validated, confirm you control it and receive a small test transfer.
      </p>
      <Flash ok={flash.ok} error={flash.error} />

      <Card
        title={`Offered at checkout (${taking} of ${enabled.length} taking payments)`}
        actions={<span className="text-xs text-warm/45">Live needs a validated address; addresses are checksum-checked.</span>}
      >
        <div className="grid gap-3">
          {enabled.length ? enabled.map((w) => <WalletForm key={`${w.asset}:${w.network}`} w={w} />) : <p className="text-sm text-warm/55">No payment methods yet. Add one below.</p>}
        </div>
      </Card>

      <Card title="Add a payment method">
        <form action={addWalletAction} className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-64 flex-1 gap-1.5 text-xs font-medium text-warm/60">
            Coin and network
            <select name="method" required className={select} defaultValue="">
              <option value="" disabled>
                Choose a coin and network
              </option>
              {assets.map((a) => (
                <optgroup key={a.id} label={`${a.id} (${a.name})`}>
                  {addable
                    .filter((o) => o.value.startsWith(`${a.id}:`))
                    .map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Button>
            <Plus aria-hidden className="size-4" /> Add method
          </Button>
        </form>
        <p className="mt-3 text-xs text-warm/45">New methods start as test methods with a sample address. Enter your address, tick Live, send yourself a small test transfer, then tick Validated.</p>
      </Card>

      {off.length > 0 && (
        <details className="group rounded-2xl border border-line bg-panel">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Switched off ({off.length})
            <ChevronDown aria-hidden className="size-4 text-warm/45 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-line p-5">
            <p className="text-xs text-warm/45">Kept for past orders. Tick Enabled and save to offer one again.</p>
            {off.map((w) => (
              <WalletForm key={`${w.asset}:${w.network}`} w={w} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

import { KeyRound } from "lucide-react";
import { CoinIcon } from "@/components/checkout/CoinIcon";
import { Button, Flash, input, PageHeader, TestPill } from "@/components/admin/ui";
import type { AssetId, NetworkId } from "@/config/payments";
import { networkLabel } from "@/lib/orders/methods";
import { listWallets } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { walletAction } from "../../actions";

export const metadata = { title: "Wallets" };

export default async function Wallets({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("owner");
  const [wallets, flash] = await Promise.all([listWallets(), searchParams]);

  return (
    <div className="grid gap-5">
      <PageHeader title="Wallets" description="Receiving addresses customers pay to. Public addresses only." />
      <p className="flex items-start gap-2.5 rounded-lg border border-vice/25 bg-vice/[0.06] px-4 py-3 text-sm text-[#ffc2da]">
        <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0" />
        Never enter private keys or recovery phrases anywhere in this dashboard. Before marking an address validated, confirm you control it and receive a small test transfer.
      </p>
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-3">
        {wallets.map((w) => (
          <form key={`${w.asset}:${w.network}`} action={walletAction} className="grid items-end gap-4 rounded-2xl border border-line bg-panel p-4 lg:grid-cols-[12rem_minmax(0,1fr)_auto]">
            <input type="hidden" name="asset" value={w.asset} />
            <input type="hidden" name="network" value={w.network} />
            <div className="flex items-center gap-3">
              <CoinIcon asset={w.asset as AssetId} className="size-8 text-sm" />
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {w.asset} {w.isTest && <TestPill />}
                </p>
                <p className="text-xs text-warm/50">{networkLabel(w.network as NetworkId)}</p>
              </div>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-warm/60">
              Receiving address
              <input name="address" defaultValue={w.address} spellCheck={false} autoComplete="off" className={`${input} font-mono text-xs`} aria-label={`${w.asset} ${networkLabel(w.network as NetworkId)} receiving address`} />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-warm/70">
                <input type="checkbox" name="active" defaultChecked={w.active} className="size-4 accent-[#ff9b62]" />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-xs text-warm/70">
                <input type="checkbox" name="live" defaultChecked={!w.isTest} className="size-4 accent-[#ff9b62]" />
                Live
              </label>
              <label className="flex items-center gap-2 text-xs text-warm/70">
                <input type="checkbox" name="validated" defaultChecked={w.validated} className="size-4 accent-[#ff9b62]" />
                Validated
              </label>
              <Button variant="secondary" className="h-9">
                Save
              </Button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}

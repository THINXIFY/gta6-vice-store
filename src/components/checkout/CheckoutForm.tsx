"use client";

import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { EditionArt } from "@/components/sections/purchase/EditionArt";
import { accountRegions, quoteMinutes, regionCompatibilityConfirmed, type AssetId, type NetworkId } from "@/config/payments";
import { game } from "@/config/product";
import { catalogPlatforms, catalogPrice, pricedEditions, type Catalog } from "@/lib/catalog";
import type { EditionId, PlatformId } from "@/config/types";
import { formatPrice } from "@/lib/pricing";
import { networkLabel, offeredAssets } from "@/lib/orders/methods";
import { quoteAmount } from "@/lib/orders/quote";
import { orderStore } from "@/lib/orders/store";
import { cn } from "@/lib/utils";
import { CoinIcon } from "./CoinIcon";

const focusRing = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lavender has-[:focus-visible]:outline-solid";
const fieldClass =
  "h-13 w-full rounded-xl border border-warm/14 bg-obsidian/60 px-4 text-[0.9375rem] text-warm placeholder:text-warm/35 transition-colors focus:border-sunset/70 focus:outline-none";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-warm/10 pt-8 first:border-t-0 first:pt-0">
      <legend className="flex items-center gap-3 text-lg font-semibold">
        <span aria-hidden className="grid size-7 place-items-center rounded-full border border-sunset/60 font-display text-sm text-sunset">
          {n}
        </span>
        {title}
      </legend>
      <div className="mt-5">{children}</div>
    </fieldset>
  );
}

function Choice({ name, checked, onChange, children, className, disabled }: { name: string; checked: boolean; onChange: () => void; children: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors duration-300",
        focusRing,
        disabled ? "cursor-not-allowed opacity-40" : checked ? "border-sunset/70 bg-sunset/[0.07]" : "border-warm/12 hover:border-warm/30",
        className,
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      {children}
    </label>
  );
}

export function CheckoutForm({ initialEdition, initialPlatform, catalog }: { initialEdition: EditionId; initialPlatform: PlatformId; catalog: Catalog }) {
  const editions = useMemo(() => pricedEditions(catalog), [catalog]);
  const platforms = useMemo(() => catalogPlatforms(catalog), [catalog]);
  const router = useRouter();
  const assets = useMemo(() => offeredAssets(), []);
  const [edition, setEdition] = useState<EditionId>(initialEdition);
  const [platform, setPlatform] = useState<PlatformId>(initialPlatform);
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState<string>("");
  const [assetId, setAssetId] = useState<AssetId | null>(null);
  const [network, setNetwork] = useState<NetworkId | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ed = editions.find((e) => e.id === edition)!;
  const pf = platforms.find((p) => p.id === platform)!;
  const price = catalogPrice(catalog, edition, platform);
  const cents = price?.amount ?? 0;
  const asset = assets.find((a) => a.id === assetId);
  const primary = assets.filter((a) => a.primary);
  const secondary = assets.filter((a) => !a.primary);
  // Indicative estimate from the server's current rates; the exact amount is locked on the next step.
  const [rates, setRates] = useState<Partial<Record<AssetId, number>>>({});
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : { rates: {} }))
      .then((d: { rates?: Partial<Record<AssetId, number>> }) => setRates(d.rates ?? {}))
      .catch(() => {});
  }, []);
  const estimate = asset && cents && rates[asset.id] ? quoteAmount(cents, asset.id, rates[asset.id]).amount : null;

  const pickAsset = (id: AssetId) => {
    setAssetId(id);
    const a = assets.find((x) => x.id === id)!;
    setNetwork(a.networks.length === 1 ? a.networks[0]!.network : null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!asset || !network) return setError("Choose a cryptocurrency and network to continue.");
    if (!region) return setError("Choose the region of your console account.");
    setBusy(true);
    try {
      const order = await orderStore.create({
        email: email.trim(),
        region,
        edition,
        platform,
        asset: asset.id,
        network,
      });
      router.push(`/checkout/payment?id=${order.paymentId}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong creating your order. Please try again.");
    }
  };

  const assetButton = (a: (typeof assets)[number]) => (
    <Choice key={a.id} name="asset" checked={assetId === a.id} onChange={() => pickAsset(a.id)} className="h-16">
      <CoinIcon asset={a.id} />
      <span className="min-w-0">
        <span className="block font-semibold">{a.id}</span>
        <span className="block truncate text-xs text-warm/55">{a.name}</span>
      </span>
    </Choice>
  );

  return (
    <form onSubmit={submit} noValidate={false} className="grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
      {/* Order summary: first on mobile, sticky left column on desktop */}
      <aside aria-label="Your order" className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          <div className="relative aspect-video overflow-hidden rounded-media bg-midnight">
            {editions.map((e) => (
              <div key={e.id} aria-hidden className={cn("absolute inset-0 transition-opacity duration-700", e.id === edition ? "opacity-100" : "opacity-0")}>
                <EditionArt edition={e.id} platform={platform} sizes="(min-width: 64rem) 40vw, 100vw" />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-media border border-warm/10 bg-midnight/60 p-6">
            <p className="text-sm text-warm/55">{game.title}</p>
            <p className="mt-1 font-display text-[2rem] leading-none font-extrabold uppercase">{ed.name}</p>
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-warm/55">Platform</dt>
              <dd className="text-right">{pf.name}</dd>
              <dt className="text-warm/55">Format</dt>
              <dd className="text-right">Digital code</dd>
              <dt className="text-warm/55">Pay with</dt>
              <dd className="text-right">{asset ? `${asset.id}${network ? ` on ${networkLabel(network)}` : ""}` : "Not chosen yet"}</dd>
            </dl>
            <div className="mt-6 flex items-end justify-between border-t border-warm/10 pt-5">
              <span className="font-semibold">Total</span>
              <span className="text-right">
                <span className="block font-display text-[2.5rem] leading-none font-extrabold tabular-nums">{formatPrice(price) ?? "—"}</span>
                {estimate && (
                  <span className="mt-1 block text-sm text-warm/60 tabular-nums">
                    ≈ {estimate} {asset!.id}
                  </span>
                )}
              </span>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2.5 text-sm text-warm/55">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-sunset" />
            Guest checkout. We will never ask for your wallet&apos;s private keys or recovery phrase.
          </p>
        </div>
      </aside>

      <div className="grid gap-8 lg:col-span-7">
        <Step n={1} title="Your game">
          <div className="grid gap-5">
            <div role="radiogroup" aria-label="Platform" className="grid grid-cols-2 gap-1 rounded-control border border-warm/12 p-1">
              {platforms.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex h-12 cursor-pointer items-center justify-center rounded-control text-sm font-semibold transition-colors",
                    focusRing,
                    !p.available ? "cursor-not-allowed text-warm/30 line-through" : platform === p.id ? "bg-warm text-obsidian" : "text-warm/70 hover:text-warm",
                  )}
                >
                  <input type="radio" name="platform" checked={platform === p.id} disabled={!p.available} onChange={() => setPlatform(p.id)} className="sr-only" />
                  {p.name}
                </label>
              ))}
            </div>
            <div role="radiogroup" aria-label="Edition" className="grid gap-3 sm:grid-cols-2">
              {editions.map((e) => (
                <Choice key={e.id} name="edition" checked={edition === e.id} onChange={() => setEdition(e.id)} disabled={e.prices[platform].amount === null} className="justify-between py-4">
                  <span>
                    <span className="block font-semibold">{e.name}</span>
                    <span className="block text-xs text-warm/55">{e.id === "ultimate" ? "Game + 16 extras" : "The full game"}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(e.prices[platform]) ?? "Unavailable"}</span>
                </Choice>
              ))}
            </div>
          </div>
        </Step>

        <Step n={2} title="Your details">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-warm/70">Email for your order</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={fieldClass} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-warm/70">Console account region</span>
              <span className="relative">
                <select required value={region} onChange={(e) => setRegion(e.target.value)} className={cn(fieldClass, "appearance-none pr-10", !region && "text-warm/45")}>
                  <option value="" disabled>
                    Choose a region
                  </option>
                  {accountRegions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-warm/50" />
              </span>
            </label>
          </div>
          <p className="mt-3 text-sm text-warm/50">
            {regionCompatibilityConfirmed
              ? "Codes work with the region you choose."
              : "Region compatibility for each code will be shown here before payments open. Order updates go to this email."}
          </p>
        </Step>

        <Step n={3} title="Pay with crypto">
          <div role="radiogroup" aria-label="Cryptocurrency" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {primary.map(assetButton)}
          </div>
          {secondary.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                aria-expanded={more || secondary.some((a) => a.id === assetId)}
                aria-controls="more-assets"
                onClick={() => setMore((v) => !v)}
                className="inline-flex items-center gap-2 rounded-control px-1 py-2 text-sm font-medium text-warm/70 hover:text-warm"
              >
                More payment options
                <ChevronDown aria-hidden className={cn("size-4 transition-transform", (more || secondary.some((a) => a.id === assetId)) && "rotate-180")} />
              </button>
              <div id="more-assets" role="radiogroup" aria-label="More cryptocurrencies" className={cn("mt-2 grid-cols-2 gap-3 sm:grid-cols-4", more || secondary.some((a) => a.id === assetId) ? "grid" : "hidden")}>
                {secondary.map(assetButton)}
              </div>
            </div>
          )}

          {asset && (
            <div key={asset.id} className="swap-in mt-6">
              <p className="text-sm text-warm/70">Network for {asset.id}</p>
              <div role="radiogroup" aria-label={`Network for ${asset.id}`} className="mt-3 flex flex-wrap gap-2">
                {asset.networks.map((n) => (
                  <label
                    key={n.network}
                    className={cn(
                      "flex h-11 cursor-pointer items-center rounded-control border px-4 text-sm font-medium transition-colors",
                      focusRing,
                      network === n.network ? "border-sunset bg-sunset/10 text-warm" : "border-warm/14 text-warm/70 hover:border-warm/30 hover:text-warm",
                    )}
                  >
                    <input type="radio" name="network" checked={network === n.network} onChange={() => setNetwork(n.network)} className="sr-only" />
                    {networkLabel(n.network)}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-sm text-warm/50">Send only on the network you choose here. Funds sent on another network can be lost.</p>
            </div>
          )}
        </Step>

        <div className="border-t border-warm/10 pt-8">
          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-vice/10 px-4 py-3 text-sm text-[#ff9fc4]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="group inline-flex h-15 w-full items-center justify-center gap-2.5 rounded-control bg-[linear-gradient(100deg,var(--color-vice)_0%,#ff7a7c_45%,var(--color-sunset)_100%)] bg-[length:140%_100%] bg-left text-base font-semibold text-obsidian transition-[background-position,transform] duration-500 ease-swift hover:bg-right active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Creating your order…" : "Continue to payment"}
            <ArrowRight aria-hidden className="size-4.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <p className="mt-3 text-center text-sm text-warm/50">
            Your amount is held for {quoteMinutes} minutes on the next step.
          </p>
        </div>
      </div>
    </form>
  );
}

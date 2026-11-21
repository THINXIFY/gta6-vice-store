"use client";

import { AlertTriangle, ArrowRight, Check, Clock, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { EditionArt } from "@/components/sections/purchase/EditionArt";
import { networks, quoteMinutes, regionCompatibilityConfirmed, targetProcessingMinutes, type AssetId, type NetworkId } from "@/config/payments";
import { catalogPlatforms, catalogPrice, pricedEditions, type Catalog } from "@/lib/catalog";
import type { EditionId, PlatformId } from "@/config/types";
import { formatPrice } from "@/lib/pricing";
import { networkLabel, offeredAssets } from "@/lib/orders/methods";
import { quoteAmount } from "@/lib/orders/quote";
import { orderStore } from "@/lib/orders/store";
import { cn } from "@/lib/utils";
import { CoinIcon } from "./CoinIcon";
import { PolicyLinks } from "./PolicyLinks";
import { RegionSelect } from "./RegionSelect";
import { DeliveryNote } from "./ui";

const focusRing = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lavender has-[:focus-visible]:outline-solid";
const fieldClass =
  "h-13 w-full rounded-xl border bg-obsidian/60 px-4 text-[0.9375rem] text-warm placeholder:text-warm/35 transition-colors focus:border-sunset/70 focus:outline-none";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A numbered form section whose marker turns into a tick once it is complete. */
function Step({ n, title, done, hint, children }: { n: number; title: string; done: boolean; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-media border border-warm/10 bg-midnight/40 p-5 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full font-display text-sm transition-colors duration-500",
            done ? "bg-sunset text-obsidian" : "border border-sunset/60 text-sunset",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        <span className="text-lg font-semibold">{title}</span>
        {hint && <span className="ml-auto hidden text-sm text-warm/45 sm:block">{hint}</span>}
      </div>
      <div className="mt-6">{children}</div>
    </fieldset>
  );
}

/** A selectable card with a radio marker on the right. */
function Choice({ name, checked, onChange, children, className, disabled }: { name: string; checked: boolean; onChange: () => void; children: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-[border-color,background-color] duration-300",
        focusRing,
        disabled ? "cursor-not-allowed opacity-40" : checked ? "border-sunset/70 bg-sunset/[0.07]" : "border-warm/12 hover:border-warm/30 hover:bg-warm/[0.02]",
        className,
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      {children}
      <Marker checked={checked} />
    </label>
  );
}

function Marker({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-full border transition-colors", checked ? "border-sunset bg-sunset text-obsidian" : "border-warm/25 text-transparent")}>
      <Check className="size-3" strokeWidth={3.5} />
    </span>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="flex items-center gap-1.5 text-[0.8125rem] text-danger-soft">
      <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

export function CheckoutForm({ initialEdition, initialPlatform, catalog }: { initialEdition: EditionId; initialPlatform: PlatformId; catalog: Catalog }) {
  const editions = useMemo(() => pricedEditions(catalog), [catalog]);
  const platforms = useMemo(() => catalogPlatforms(catalog), [catalog]);
  const router = useRouter();
  // The methods enabled in Admin → Wallets (live: validated live addresses only).
  const assets = useMemo(() => offeredAssets(catalog.methods), [catalog.methods]);
  const [edition, setEdition] = useState<EditionId>(initialEdition);
  const [platform, setPlatform] = useState<PlatformId>(initialPlatform);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [region, setRegion] = useState<string>("");
  const [assetId, setAssetId] = useState<AssetId | null>(null);
  const [network, setNetwork] = useState<NetworkId | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitRef = useRef<HTMLDivElement>(null);
  const [submitVisible, setSubmitVisible] = useState(true);

  const ed = editions.find((e) => e.id === edition)!;
  const pf = platforms.find((p) => p.id === platform)!;
  const price = catalogPrice(catalog, edition, platform);
  const cents = price?.amount ?? 0;
  const total = formatPrice(price) ?? "—";
  const asset = assets.find((a) => a.id === assetId);
  // Every offered asset/network pair is one choice (no separate network step).
  const methods = useMemo(() => assets.flatMap((a) => a.networks.map((n) => ({ asset: a, network: n.network }))), [assets]);
  // Indicative estimate from the server's current rates; the exact amount is locked on the next step.
  const [rates, setRates] = useState<Partial<Record<AssetId, number>>>({});
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : { rates: {} }))
      .then((d: { rates?: Partial<Record<AssetId, number>> }) => setRates(d.rates ?? {}))
      .catch(() => {});
  }, []);
  const estimateFor = (id: AssetId) => (cents && rates[id] ? quoteAmount(cents, id, rates[id]).amount : null);
  const estimate = asset ? estimateFor(asset.id) : null;

  // The phone-only sticky bar appears while the main button is off screen.
  useEffect(() => {
    const el = submitRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSubmitVisible(Boolean(e?.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const emailOk = EMAIL.test(email.trim());
  const detailsDone = emailOk && Boolean(region);
  const payDone = Boolean(asset && network);
  const emailError = (emailTouched || attempted) && !emailOk ? (email.trim() ? "Check the email address, for example name@example.com." : "Enter the email for your order.") : null;
  const regionError = attempted && !region ? "Choose the country of your console account." : null;
  const methodError = attempted && !payDone ? "Choose how you want to pay." : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setError(null);
    // Take the buyer to the first thing that still needs an answer.
    if (!emailOk) return document.getElementById("checkout-email")?.focus();
    if (!region) return document.querySelector<HTMLElement>("[data-region-trigger]")?.focus();
    if (!asset || !network) {
      document.getElementById("pay-step")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return setError("Choose how you want to pay to continue.");
    }
    setBusy(true);
    try {
      const order = await orderStore.create({ email: email.trim(), region, edition, platform, asset: asset.id, network });
      router.push(`/checkout/payment?id=${order.paymentId}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong creating your order. Please try again.");
    }
  };

  const summaryRows = (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
      <dt className="text-warm/55">Platform</dt>
      <dd className="text-right">{pf.name}</dd>
      <dt className="text-warm/55">Delivery</dt>
      <dd className="text-right">Digital code by email</dd>
      <dt className="text-warm/55">Pay with</dt>
      <dd className="text-right">{asset && network ? `${asset.id} on ${networkLabel(network)}` : <span className="text-warm/40">Not chosen yet</span>}</dd>
    </dl>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
      {/* Phones: compact order bar instead of the large artwork. */}
      <aside aria-label="Your order" className="lg:hidden">
        <div className="flex items-center gap-4 rounded-media border border-warm/10 bg-midnight/60 p-3 pr-5">
          <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-midnight">
            <EditionArt edition={edition} platform={platform} sizes="7rem" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{ed.name}</p>
            <p className="truncate text-xs text-warm/55">{pf.name}</p>
          </div>
          <p className="font-display text-2xl font-extrabold tabular-nums">{total}</p>
        </div>
      </aside>

      {/* Desktop: sticky summary column. */}
      <aside aria-label="Order summary" className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-28 grid gap-5">
          <div className="overflow-hidden rounded-media border border-warm/10 bg-midnight/60">
            <div className="relative aspect-video bg-midnight">
              {editions.map((e) => (
                <div key={e.id} aria-hidden className={cn("absolute inset-0 transition-opacity duration-700", e.id === edition ? "opacity-100" : "opacity-0")}>
                  <EditionArt edition={e.id} platform={platform} sizes="(min-width: 64rem) 40vw, 100vw" />
                </div>
              ))}
            </div>
            <div className="p-6">
              <p className="text-sm text-warm/55">{catalog.product.title}</p>
              <p className="mt-1 font-display text-[2rem] leading-none font-extrabold uppercase">{ed.name}</p>
              <div className="mt-6">{summaryRows}</div>
              <div className="mt-6 flex items-end justify-between border-t border-warm/10 pt-5">
                <span className="font-semibold">Total</span>
                <span className="text-right">
                  <span className="block font-display text-[2.5rem] leading-none font-extrabold tabular-nums">{total}</span>
                  {estimate && (
                    <span className="mt-1 block text-sm text-warm/60 tabular-nums">
                      ≈ {estimate} {asset!.id}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-media border border-warm/10 p-6">
            <p className="font-semibold">What happens next</p>
            <ol className="mt-4 grid gap-3.5 text-sm text-warm/70">
              {[
                { icon: Clock, text: `You get the exact amount and our address, held for ${quoteMinutes} minutes.` },
                { icon: KeyRound, text: "You send the payment from your wallet or exchange and add the transaction hash." },
                { icon: Mail, text: `We check it on the blockchain (we aim for ${targetProcessingMinutes} minutes) and email you a link to download your game.` },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex gap-3">
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-sunset" />
                  {text}
                </li>
              ))}
            </ol>
          </div>

          <p className="flex items-start gap-2.5 px-1 text-sm text-warm/55">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-sunset" />
            Guest checkout, no account needed. We will never ask for your wallet&apos;s private keys or recovery phrase.
          </p>
        </div>
      </aside>

      <div className="grid content-start gap-5 lg:col-span-7">
        <Step n={1} title="Your game" done>
          <div className="grid gap-4">
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
                <Choice key={e.id} name="edition" checked={edition === e.id} onChange={() => setEdition(e.id)} disabled={e.prices[platform]?.amount == null}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{e.name}</span>
                    <span className="block text-xs text-warm/55">{e.shortSummary}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(e.prices[platform]) ?? "Unavailable"}</span>
                </Choice>
              ))}
            </div>
          </div>
        </Step>

        <Step n={2} title="Your details" done={detailsDone}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid content-start gap-2 text-sm">
              <span className="text-warm/70">Email for your order</span>
              <input
                id="checkout-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@example.com"
                aria-invalid={Boolean(emailError) || undefined}
                aria-describedby={emailError ? "email-error" : "email-help"}
                className={cn(fieldClass, emailError ? "border-vice/70" : emailOk ? "border-warm/25" : "border-warm/14")}
              />
              {emailError ? (
                <FieldError id="email-error">{emailError}</FieldError>
              ) : (
                <span id="email-help" className="text-[0.8125rem] text-warm/45">
                  Your code and order updates go here.
                </span>
              )}
            </label>
            <div className="grid content-start gap-2 text-sm">
              <span id="region-label" className="text-warm/70">
                Console account region
              </span>
              <RegionSelect value={region} onChange={setRegion} labelId="region-label" invalid={Boolean(regionError)} describedBy={regionError ? "region-error" : "region-help"} />
              {regionError ? (
                <FieldError id="region-error">{regionError}</FieldError>
              ) : (
                <span id="region-help" className="text-[0.8125rem] text-warm/45">
                  {regionCompatibilityConfirmed ? "Codes work with the region you choose." : "Where your PlayStation or Xbox account is registered."}
                </span>
              )}
            </div>
          </div>
        </Step>

        <div id="pay-step">
          <Step n={3} title="Pay with crypto" done={payDone} hint={`${methods.length} ways to pay`}>
            <div role="radiogroup" aria-label="Payment method" aria-describedby={methodError ? "method-error" : undefined} className="grid gap-3 sm:grid-cols-2">
              {methods.map(({ asset: a, network: n }) => {
                const checked = assetId === a.id && network === n;
                const net = networks[n];
                const est = estimateFor(a.id);
                return (
                  <label
                    key={`${a.id}:${n}`}
                    data-method={`${a.id}:${n}`}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-[border-color,background-color] duration-300",
                      focusRing,
                      checked ? "border-sunset/70 bg-sunset/[0.07]" : methodError ? "border-vice/40 hover:border-warm/30" : "border-warm/12 hover:border-warm/30 hover:bg-warm/[0.02]",
                    )}
                  >
                    <input
                      type="radio"
                      name="method"
                      checked={checked}
                      onChange={() => {
                        setAssetId(a.id);
                        setNetwork(n);
                        setError(null);
                      }}
                      className="sr-only"
                    />
                    <CoinIcon asset={a.id} className="size-10" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className="font-semibold">{a.id}</span>
                        {net.standard && <span className="rounded-md bg-warm/8 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-warm/75">{net.standard}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-warm/55">{net.standard ? `${a.name} on ${net.name}` : `${a.name} network`}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      {est && <span className="text-xs text-warm/55 tabular-nums">≈ {est}</span>}
                      <Marker checked={checked} />
                    </span>
                  </label>
                );
              })}
            </div>

            {asset && network ? (
              <div key={`${asset.id}:${network}`} role="note" className="swap-in mt-5 flex gap-3 rounded-xl border border-vice/25 bg-vice/[0.07] px-4 py-3.5 text-sm text-danger-pale">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p>
                  Send only <strong className="font-semibold text-warm">{asset.id}</strong> on <strong className="font-semibold text-warm">{networkLabel(network)}</strong>. Payments in another coin or on another network can be lost.
                </p>
              </div>
            ) : methodError ? (
              <p className="mt-4">
                <FieldError id="method-error">{methodError}</FieldError>
              </p>
            ) : (
              <p className="mt-4 text-sm text-warm/50">Pick the coin and network your wallet or exchange sends from. You get the exact amount and address on the next step.</p>
            )}
          </Step>
        </div>

        <DeliveryNote />

        <div ref={submitRef} className="pt-1">
          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-vice/10 px-4 py-3 text-sm text-danger-soft">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="group inline-flex h-15 w-full items-center justify-center gap-2.5 rounded-control bg-[linear-gradient(100deg,var(--color-vice)_0%,var(--color-blend)_45%,var(--color-sunset)_100%)] bg-[length:140%_100%] bg-left text-base font-semibold text-obsidian transition-[background-position,transform] duration-500 ease-swift hover:bg-right active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? (
              "Creating your order…"
            ) : (
              <>
                Continue to payment
                <span aria-hidden className="h-4 w-px bg-obsidian/25" />
                <span className="tabular-nums">{total}</span>
                <ArrowRight aria-hidden className="size-4.5 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-warm/50">
            <Clock aria-hidden className="size-3.5" />
            Your amount is held for {quoteMinutes} minutes on the next step.
          </p>
          <PolicyLinks className="mt-2 text-center text-xs leading-relaxed text-warm/50" />
        </div>
      </div>

      {/* Phones: total and a continue button stay in reach while the main button is off screen. */}
      <div
        aria-hidden={submitVisible}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-warm/10 bg-obsidian/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-500 ease-cinematic lg:hidden",
          submitVisible ? "pointer-events-none translate-y-full" : "translate-y-0",
        )}
      >
        <div className="mx-auto flex max-w-content items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-warm/55">Total</p>
            <p className="font-display text-2xl leading-none font-extrabold tabular-nums">{total}</p>
          </div>
          <button
            type="submit"
            tabIndex={submitVisible ? -1 : 0}
            disabled={busy}
            className="inline-flex h-12 items-center gap-2 rounded-control bg-[linear-gradient(100deg,var(--color-vice),var(--color-sunset))] px-6 text-sm font-semibold text-obsidian disabled:opacity-60"
          >
            Continue
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

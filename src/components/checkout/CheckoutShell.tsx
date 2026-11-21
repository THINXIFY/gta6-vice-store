import { ArrowLeft, Check, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Layout";
import { getCopy } from "@/server/content";
import { checkoutAvailable, checkoutIsPreview } from "@/lib/checkout";
import { cn } from "@/lib/utils";

const STAGES = ["Your order", "Payment", "Your code"] as const;

/** Where the buyer is in the purchase (a real sequence, so it is numbered). */
function Progress({ stage }: { stage: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Checkout progress" className="mt-8 flex max-w-[34rem] items-center gap-2 sm:gap-3">
      {STAGES.map((label, i) => {
        const n = i + 1;
        const state = n < stage ? "done" : n === stage ? "current" : "next";
        return (
          <li key={label} aria-current={state === "current" ? "step" : undefined} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full font-display text-[0.8125rem]",
                state === "done" && "bg-sunset/20 text-sunset",
                state === "current" && "bg-sunset text-obsidian",
                state === "next" && "border border-warm/20 text-warm/45",
              )}
            >
              {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={cn("text-sm whitespace-nowrap", state === "current" ? "font-semibold text-warm" : state === "done" ? "text-warm/70" : "text-warm/45")}>
              {label}
              {state === "done" && <span className="sr-only"> (done)</span>}
            </span>
            {n < STAGES.length && <span aria-hidden className={cn("h-px min-w-3 flex-1", n < stage ? "bg-sunset/50" : "bg-warm/12")} />}
          </li>
        );
      })}
    </ol>
  );
}

/** Shared frame for checkout pages: title, preview marker, closed state when checkout is off. */
export async function CheckoutShell({ eyebrow, title, intro, back, stage, children }: { eyebrow: string; title: string; intro?: string; back?: { href: string; label: string }; stage?: 1 | 2 | 3; children: ReactNode }) {
  // Wording from Admin → Content (defaults in src/config/content.ts).
  const copy = await getCopy();
  const purchaseCopy = copy.purchase;
  return (
    <>
      <main id="main" data-checkout-shell className="relative isolate min-h-svh overflow-hidden bg-obsidian">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(70%_60%_at_80%_0%,color-mix(in_oklab,var(--color-vice)_14%,transparent),color-mix(in_oklab,var(--color-sunset)_6%,transparent)_45%,transparent_75%)]" />
        <Container className="pt-28 pb-[clamp(4rem,3rem+4vw,7rem)] lg:pt-36">
          <Link href={back?.href ?? "/"} className="inline-flex items-center gap-2 text-sm text-warm/60 transition-colors hover:text-warm">
            <ArrowLeft aria-hidden className="size-4" />
            {back?.label ?? "Back to the store"}
          </Link>
          <p className="mt-8 flex items-center gap-3 text-sm font-medium text-sunset">
            <span aria-hidden className="h-px w-8 bg-sunset/70" />
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-display-md font-extrabold tracking-[-0.005em]">{title}</h1>
          {intro && <p className="mt-4 max-w-[40rem] text-warm/70">{intro}</p>}
          {stage && checkoutAvailable && <Progress stage={stage} />}

          {checkoutIsPreview && <span hidden data-checkout-preview />}

          <div className="mt-10 lg:mt-14">
            {checkoutAvailable ? (
              children
            ) : (
              <section className="max-w-[36rem] rounded-media border border-warm/10 bg-midnight/60 p-8">
                <Lock aria-hidden className="size-6 text-sunset" />
                <h2 className="mt-4 text-xl font-semibold">Checkout isn’t open yet</h2>
                <p className="mt-2 text-warm/70">{purchaseCopy.checkoutClosed}</p>
                <Link href="/#editions" className="mt-6 inline-flex h-12 items-center rounded-control bg-warm px-6 text-sm font-semibold text-obsidian">
                  Explore editions
                </Link>
              </section>
            )}
          </div>
        </Container>
      </main>
      <Footer base="/" />
    </>
  );
}

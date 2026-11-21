import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Layout";
import { purchaseCopy } from "@/config/content";
import { site } from "@/config/site";
import { checkoutAvailable, checkoutIsPreview } from "@/lib/checkout";

/** Shared frame for checkout pages: title, preview marker, closed state when checkout is off. */
export function CheckoutShell({ eyebrow, title, intro, back, children }: { eyebrow: string; title: string; intro?: string; back?: { href: string; label: string }; children: ReactNode }) {
  return (
    <>
      <main id="main" data-checkout-shell className="relative isolate min-h-svh overflow-hidden bg-obsidian">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(70%_60%_at_80%_0%,rgb(255_87_154/0.14),rgb(255_155_98/0.06)_45%,transparent_75%)]" />
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
          <p className="mt-14 max-w-[48rem] text-xs leading-relaxed text-warm/40">{site.disclaimer}</p>
        </Container>
      </main>
      <Footer base="/" />
    </>
  );
}

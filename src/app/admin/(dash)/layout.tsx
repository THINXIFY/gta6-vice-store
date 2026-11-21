import { FlaskConical, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { checkoutOpen } from "@/lib/checkout";
import { reviewCount } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { emailSettings } from "@/server/email";
import { logoutAction } from "../actions";

export default async function DashLayout({ children }: { children: ReactNode }) {
  const me = await requireAdmin(undefined, { allowWithout2fa: true }); // each page enforces 2FA itself
  const toReview = await reviewCount();
  const mail = emailSettings().mode;
  return (
    <div className="lg:flex">
      <Sidebar email={me.email} role={me.role} reviewCount={toReview} logout={logoutAction} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-admin/85 px-4 backdrop-blur-md sm:px-8 lg:h-16">
          <form action="/admin/orders" role="search" className="relative w-full max-w-md">
            <label htmlFor="global-search" className="sr-only">
              Find an order
            </label>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-warm/35" />
            <input
              id="global-search"
              name="q"
              placeholder="Find an order: Payment ID, email or TXID"
              className="h-9 w-full rounded-lg border border-line bg-well pr-3 pl-9 text-sm text-warm placeholder:text-warm/35 focus:border-vice/60 focus:ring-3 focus:ring-vice/15 focus:outline-none"
            />
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {toReview > 0 && (
              <Link href="/admin/orders?status=review" className="hidden items-center gap-2 rounded-lg bg-sunset/12 px-3 py-1.5 text-xs font-semibold text-sunset transition-colors hover:bg-sunset/20 sm:inline-flex">
                <span aria-hidden className="size-1.5 rounded-full bg-sunset" />
                {toReview} to review
              </Link>
            )}
            {!checkoutOpen && (
              <span title="Live checkout is disabled. Orders, wallets and fulfillment items marked Test are not real." className="inline-flex items-center gap-1.5 rounded-lg border border-[#ffd400]/25 bg-[#ffd400]/[0.06] px-2.5 py-1.5 text-xs font-semibold text-[#ffe680]">
                <FlaskConical aria-hidden className="size-3.5" />
                <span className="max-sm:sr-only">Development mode</span>
                {mail !== "live" && <span className="sr-only">, emails in {mail} mode</span>}
              </span>
            )}
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl px-4 py-7 sm:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}

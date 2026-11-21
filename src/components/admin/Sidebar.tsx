"use client";

import { FileText, Gamepad2, LayoutDashboard, LayoutTemplate, LifeBuoy, ListChecks, LogOut, Mail, Menu, Rocket, Settings, Tags, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, owner: false },
      { href: "/admin/orders", label: "Orders & Payments", icon: ListChecks, owner: false, badge: "review" as const },
      { href: "/admin/support", label: "Support", icon: LifeBuoy, owner: false, badge: "support" as const },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/wallets", label: "Wallets", icon: Wallet, owner: true },
      { href: "/admin/pricing", label: "Catalogue", icon: Tags, owner: true },
      { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate, owner: true },
      { href: "/admin/content", label: "Content", icon: FileText, owner: true },
      { href: "/admin/fulfillment", label: "Game Fulfillment", icon: Gamepad2, owner: true },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/launch", label: "Launch checklist", icon: Rocket, owner: true },
      { href: "/admin/emails", label: "Emails", icon: Mail, owner: false },
      { href: "/admin/settings", label: "Settings", icon: Settings, owner: false },
    ],
  },
];

export function Sidebar({ email, role, reviewCount, supportCount, logout }: { email: string; role: "owner" | "reviewer"; reviewCount: number; supportCount: number; logout: () => Promise<void> }) {
  const path = usePathname();
  // Phones: the menu is a button that opens the grouped list (13 items do not fit a scrolling strip).
  const [open, setOpen] = useState(false);
  const current = GROUPS.flatMap((g) => g.items).find((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href)));
  const pending = reviewCount + supportCount;
  return (
    <aside className="relative isolate flex shrink-0 flex-col overflow-hidden border-line bg-panel max-lg:border-b lg:sticky lg:top-0 lg:h-svh lg:w-64 lg:border-r">
      {/* Dusk glow at the top: the one place the storefront's neon shows through. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--color-vice)_16%,transparent),transparent_60%),radial-gradient(90%_70%_at_100%_0%,color-mix(in_oklab,var(--color-lavender)_12%,transparent),transparent_65%)]"
      />
      <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:px-6">
        <Link href="/admin" className="flex items-baseline gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vice">
          <Wordmark className="text-[1.375rem]" />
          <span className="text-xs font-medium text-warm/50">Admin</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-panel-2 px-3 text-sm font-medium text-warm/85 lg:hidden"
        >
          {open ? <X aria-hidden className="size-4" /> : <Menu aria-hidden className="size-4" />}
          <span className="max-w-[9rem] truncate">{open ? "Close" : (current?.label ?? "Menu")}</span>
          {!open && pending > 0 && (
            <span className="rounded-full bg-sunset/15 px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold text-sunset tabular-nums">
              {pending}
              <span className="sr-only"> waiting</span>
            </span>
          )}
        </button>
      </div>
      <nav
        id="admin-nav"
        aria-label="Admin"
        className={cn("flex-col gap-4 px-3 pt-1 pb-4 lg:flex lg:flex-1 lg:gap-5 lg:overflow-y-auto lg:px-4 lg:pt-3", open ? "flex" : "hidden")}
      >
        {GROUPS.map((g) => {
          const items = g.items.filter((n) => !n.owner || role === "owner");
          if (!items.length) return null;
          return (
            <div key={g.label} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold text-warm/35">{g.label}</p>
              {items.map((n) => {
                const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-vice",
                      active ? "bg-vice/[0.12] text-warm" : "text-warm/60 hover:bg-warm/[0.05] hover:text-warm",
                    )}
                  >
                    {active && (
                      <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-vice to-sunset" />
                    )}
                    <n.icon aria-hidden className={cn("size-4 transition-colors", active ? "text-vice" : "text-warm/45")} />
                    {n.label}
                    {"badge" in n && (n.badge === "review" ? reviewCount : supportCount) > 0 && (
                      <span className="ml-auto rounded-full bg-sunset/15 px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold text-sunset tabular-nums">
                        {n.badge === "review" ? reviewCount : supportCount}
                        <span className="sr-only">{n.badge === "review" ? " to review" : " open"}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
        <form action={logout} className="shrink-0 lg:hidden">
          <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-warm/60 hover:bg-warm/[0.05] hover:text-warm">
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        </form>
      </nav>
      <div className="hidden items-center gap-3 border-t border-line px-4 py-4 lg:flex">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-vice to-lavender text-sm font-semibold text-obsidian uppercase">
          {email.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{email}</p>
          <p className="text-xs text-warm/50 capitalize">{role}</p>
        </div>
        <form action={logout}>
          <button title="Sign out" className="grid size-9 place-items-center rounded-lg text-warm/55 transition-colors hover:bg-warm/[0.06] hover:text-warm focus-visible:outline-2 focus-visible:outline-vice">
            <LogOut aria-hidden className="size-4" />
            <span className="sr-only">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

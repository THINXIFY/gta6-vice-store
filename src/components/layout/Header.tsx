"use client";

import { Menu, PackageSearch, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, useMemo } from "react";
import { getLenis, scrollToHash } from "@/components/motion/SmoothScroll";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Wordmark";
import { useCatalog } from "@/components/CatalogProvider";
import type { NavItem } from "@/lib/blocks";
import { site } from "@/config/site";
import { checkoutAvailable } from "@/lib/checkout";
import { cn } from "@/lib/utils";


/** Tracks which nav section is currently under the header. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? "");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ids) {
      const el = document.querySelector(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

/**
 * Floating glass header: brand left, centred navigation with a sliding glossy pill on the
 * current section, utilities and the signature purchase CTA right. Below md the nav moves into
 * a full-screen menu (native <dialog>: focus trap, Esc to close).
 */
export function Header({ nav }: { nav: NavItem[] }) {
  const catalog = useCatalog();
  const navIds = useMemo(() => nav.map((n) => n.href), [nav]);
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const active = useActiveSection(navIds);
  // Off the landing page, anchors point back to it ("/#editions") and navigate normally.
  const pathname = usePathname();
  const onHome = pathname === "/";
  const to = (hash: string) => (onHome ? hash : `/${hash}`);
  const current = onHome ? active : "";

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  // Position the active pill under the current link (re-measured on resize and font load).
  useLayoutEffect(() => {
    const measure = () => {
      const list = navRef.current;
      const el = list?.querySelector<HTMLElement>(`a[href="${current}"]`);
      if (!list || !el) return setPill(null);
      const a = el.getBoundingClientRect();
      setPill({ x: a.left - list.getBoundingClientRect().left, w: a.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [current]);

  const openMenu = () => {
    dialogRef.current?.showModal();
    getLenis()?.stop();
  };

  /**
   * Close the menu, unlock scrolling, then travel to the section.
   * Lenis is resumed explicitly: the dialog's `close` event fires asynchronously,
   * and a stopped Lenis ignores scrollTo.
   */
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    const hash = event.currentTarget.hash;
    if (!hash || !onHome) return;
    event.preventDefault();
    dialogRef.current?.close();
    getLenis()?.start();
    scrollToHash(hash);
  };

  const platformNames = catalog.platforms.filter((p) => p.available).map((p) => p.shortName).join(" and ");
  // The admin dashboard has its own chrome.
  if (pathname.startsWith("/admin")) return null;

  return (
    <header data-scrolled={scrolled || undefined} className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={cn(
          "glass-bar pointer-events-auto relative mx-auto grid h-14 max-w-[78rem] grid-cols-[1fr_auto] items-center gap-4 rounded-full pr-1.5 pl-5 sm:h-16 sm:pr-2 sm:pl-6 md:grid-cols-[1fr_auto_1fr]",
          "transition-[background-color,box-shadow] duration-500 ease-swift",
          scrolled ? "bg-admin/80" : "bg-admin/55",
        )}
      >
        <a href={to("#overview")} onClick={navigate} className="flex items-center gap-3.5 justify-self-start rounded-full focus-visible:outline-offset-4" aria-label={`${site.name}, back to top`}>
          <Wordmark priority className="text-[1.375rem] sm:text-[1.625rem]" />
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul ref={navRef} className="relative flex items-center rounded-full p-1">
            {/* Glossy pill under the current section; slides between items. */}
            <span
              aria-hidden
              className={cn("nav-pill pointer-events-none absolute top-1 bottom-1 left-0 rounded-full motion-safe:transition-[transform,width,opacity] motion-safe:duration-500 motion-safe:ease-cinematic", pill ? "opacity-100" : "opacity-0")}
              style={{ width: pill?.w ?? 0, transform: `translateX(${pill?.x ?? 0}px)` }}
            />
            {nav.map((item) => {
              const isCurrent = current === item.href;
              return (
                <li key={item.href}>
                  <a
                    href={to(item.href)}
                    onClick={navigate}
                    aria-current={isCurrent ? "location" : undefined}
                    className={cn(
                      "relative block rounded-full px-3.5 py-2 text-[0.875rem] font-medium tracking-[0.01em] transition-[color,background-color] duration-300 lg:px-[1.125rem]",
                      isCurrent ? "text-warm" : "text-warm/60 hover:bg-white/[0.06] hover:text-warm",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 justify-self-end sm:gap-1.5">
          {checkoutAvailable && (
            <Link
              href="/order-status"
              title="Order status"
              className="hidden size-11 place-items-center rounded-full text-warm/70 transition-[color,background-color,box-shadow] duration-300 hover:bg-white/[0.07] hover:text-warm hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] sm:grid"
            >
              <PackageSearch aria-hidden className="size-[1.15rem]" />
              <span className="sr-only">Order status</span>
            </Link>
          )}
          <Button href={to(site.purchaseHref)} onClick={navigate} variant="sunset" className="h-11 px-5 shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--color-vice)_60%,transparent)] max-sm:h-10 max-sm:px-4">
            <ShoppingBag aria-hidden className="size-4 max-sm:hidden" strokeWidth={2.25} />
            Buy now
          </Button>
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            aria-haspopup="dialog"
            className="grid size-10 place-items-center rounded-full text-warm transition-colors hover:bg-white/[0.08] md:hidden"
          >
            <Menu aria-hidden className="size-5.5" />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onClose={() => getLenis()?.start()}
        className="mobile-menu pointer-events-auto m-0 h-dvh max-h-none w-full max-w-none bg-obsidian p-0 text-warm backdrop:bg-obsidian"
      >
        <div className="relative flex h-full flex-col px-gutter">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_85%_100%,color-mix(in_oklab,var(--color-sunset)_24%,transparent),color-mix(in_oklab,var(--color-vice)_12%,transparent)_45%,transparent_75%),radial-gradient(70%_40%_at_0%_0%,color-mix(in_oklab,var(--color-lavender)_14%,transparent),transparent_70%)]" />
          <div className="relative mt-3 flex h-14 items-center justify-between rounded-full pr-1.5 pl-5 glass-bar bg-admin/70">
            <Wordmark className="text-[1.375rem]" />
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close menu" className="grid size-10 place-items-center rounded-full hover:bg-white/[0.08]">
              <X aria-hidden className="size-5.5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="relative flex flex-1 items-center">
            <ul className="w-full">
              {nav.map((item, i) => (
                <li key={item.href} data-menu-item style={{ "--i": i } as CSSProperties} className="border-b border-warm/8">
                  <a
                    href={to(item.href)}
                    onClick={navigate}
                    aria-current={current === item.href ? "location" : undefined}
                    className="flex items-center justify-between py-3 font-display text-[clamp(2.5rem,12vw,4rem)] leading-none font-extrabold uppercase transition-colors aria-[current]:text-sunset"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div data-menu-item style={{ "--i": nav.length } as CSSProperties} className="relative grid gap-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            <Button href={to(site.purchaseHref)} onClick={navigate} variant="sunset" size="lg" className="w-full">
              <ShoppingBag aria-hidden className="size-4.5" strokeWidth={2.25} />
              Buy now
            </Button>
            {checkoutAvailable && (
              <Link href="/order-status" className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-warm/12 text-sm font-semibold text-warm/85 hover:bg-white/[0.06]">
                <PackageSearch aria-hidden className="size-4" />
                Track your order
              </Link>
            )}
            {platformNames && <p className="mt-1 text-center text-xs text-warm/55">For {platformNames}.</p>}
          </div>
        </div>
      </dialog>
    </header>
  );
}

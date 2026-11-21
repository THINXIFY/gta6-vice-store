"use client";

import { Menu, ShoppingBag, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { getLenis, scrollToHash } from "@/components/motion/SmoothScroll";
import { Button } from "@/components/ui/Button";
import { platforms } from "@/config/product";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

const wordmark = "font-display text-[1.75rem] leading-none font-extrabold tracking-[0.06em]";

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

const NAV_IDS = site.nav.map((n) => n.href);

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = useActiveSection(NAV_IDS);
  // Off the landing page, anchors point back to it ("/#editions") and navigate normally.
  const pathname = usePathname();
  const onHome = pathname === "/";
  const to = (hash: string) => (onHome ? hash : `/${hash}`);

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

  const platformNames = platforms.filter((p) => p.verified).map((p) => p.shortName).join(" and ");
  // The admin dashboard has its own chrome.
  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-500 ease-swift",
        scrolled ? "border-warm/8 bg-obsidian" : "border-transparent bg-linear-to-b from-obsidian/75 to-transparent",
      )}
    >
      <div className="mx-auto grid h-16 max-w-content grid-cols-[1fr_auto] items-center gap-6 px-gutter md:grid-cols-[1fr_auto_1fr] lg:h-20">
        <a href={to("#overview")} onClick={navigate} className="flex items-center gap-4 justify-self-start" aria-label={`${site.name}, back to top`}>
          <span className={wordmark}>{site.name}</span>
          <span aria-hidden className="hidden h-6 w-px bg-warm/20 xl:block" />
          <span className="hidden text-[0.6875rem] leading-[1.25] font-medium text-warm/55 xl:block">
            Independent
            <br />
            retailer
          </span>
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1 lg:gap-2">
            {site.nav.map((item) => {
              const current = onHome && active === item.href;
              return (
                <li key={item.href}>
                  <a
                    href={to(item.href)}
                    onClick={navigate}
                    aria-current={current ? "location" : undefined}
                    className={cn(
                      "relative block px-3.5 py-2 text-[0.9375rem] font-medium transition-colors duration-300 lg:px-4",
                      "after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-px after:origin-left after:bg-sunset after:transition-transform after:duration-500 after:ease-cinematic lg:after:inset-x-4",
                      current ? "text-warm after:scale-x-100" : "text-warm/65 after:scale-x-0 hover:text-warm",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 justify-self-end">
          <Button href={to(site.purchaseHref)} onClick={navigate} variant="sunset" className="max-sm:h-10 max-sm:px-4">
            <ShoppingBag aria-hidden className="size-4 max-sm:hidden" strokeWidth={2.25} />
            Buy now
          </Button>
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            aria-haspopup="dialog"
            className="-mr-2 grid size-11 place-items-center rounded-control text-warm transition-colors hover:bg-warm/10 md:hidden"
          >
            <Menu aria-hidden className="size-6" />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onClose={() => getLenis()?.start()}
        className="mobile-menu m-0 h-dvh max-h-none w-full max-w-none bg-obsidian p-0 text-warm backdrop:bg-obsidian"
      >
        <div className="relative flex h-full flex-col px-gutter">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_85%_100%,rgb(255_155_98/0.28),rgb(255_87_154/0.12)_45%,transparent_75%)]" />
          <div className="relative flex h-16 items-center justify-between">
            <span className={wordmark}>{site.name}</span>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close menu"
              className="-mr-2 grid size-11 place-items-center rounded-control hover:bg-warm/10"
            >
              <X aria-hidden className="size-6" />
            </button>
          </div>

          <nav aria-label="Mobile" className="relative flex flex-1 items-center">
            <ul className="w-full">
              {site.nav.map((item, i) => (
                <li key={item.href} data-menu-item style={{ "--i": i } as CSSProperties} className="border-b border-warm/8">
                  <a
                    href={to(item.href)}
                    onClick={navigate}
                    aria-current={onHome && active === item.href ? "location" : undefined}
                    className="flex items-center justify-between py-3 font-display text-[clamp(2.75rem,13vw,4.25rem)] leading-none font-extrabold uppercase aria-[current]:text-sunset"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div data-menu-item style={{ "--i": site.nav.length } as CSSProperties} className="relative pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            <Button href={to(site.purchaseHref)} onClick={navigate} variant="sunset" size="lg" className="w-full">
              <ShoppingBag aria-hidden className="size-4.5" strokeWidth={2.25} />
              Buy now
            </Button>
            <p className="mt-4 text-center text-xs text-warm/55">
              {platformNames && <>For {platformNames}. </>}
              {site.shortDisclaimer}
            </p>
          </div>
        </div>
      </dialog>
    </header>
  );
}

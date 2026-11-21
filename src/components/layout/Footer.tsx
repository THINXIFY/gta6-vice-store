import { ArrowUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Glow } from "@/components/ui/Atmosphere";
import { Container } from "@/components/ui/Layout";
import { Wordmark } from "@/components/ui/Wordmark";
import { game, platforms } from "@/config/product";
import { site } from "@/config/site";
import { checkoutAvailable } from "@/lib/checkout";
import { contentPreview } from "@/lib/media";
import { pageHref } from "@/lib/pages";

const LEGAL = ["terms", "privacy", "refunds", "cookies"] as const;

const linkClass =
  "relative inline-block py-1 text-warm/70 transition-colors duration-300 hover:text-warm " +
  "after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-right after:scale-x-0 after:bg-sunset after:transition-transform after:duration-500 after:ease-cinematic " +
  "hover:after:origin-left hover:after:scale-x-100";

type Item = { label: string; href: string };

/** A link only when it has a real destination; otherwise nothing live, a muted "pending" line in preview. */
function FooterLink({ label, href }: Item) {
  if (href) {
    return (
      <li>
        <a href={href} className={linkClass}>
          {label}
        </a>
      </li>
    );
  }
  if (!contentPreview) return null;
  return (
    <li data-status="draft" className="py-1 text-warm/35">
      {label}
      <span className="block text-xs text-warm/30">Not published yet</span>
    </li>
  );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-warm">{title}</h2>
      <ul className="mt-4 grid gap-1.5 text-[0.9375rem]">{children}</ul>
    </div>
  );
}

/**
 * Closing footer: brand, navigation, help and legal (configured destinations only),
 * verified platform/rating facts, and an oversized wordmark that ends the page.
 */
export function Footer({ base = "" }: { base?: "" | "/" }) {
  const year = new Date().getFullYear();
  const platformList = new Intl.ListFormat("en", { type: "conjunction" }).format(platforms.filter((p) => p.verified).map((p) => p.name));
  // Contact page when published (or as a draft in preview); otherwise a configured support URL/email.
  const supportHref = pageHref("contact") || site.support.url || (site.support.email ? `mailto:${site.support.email}` : "");
  const legal = LEGAL.map((id) => ({ id, label: site.pages[id].label, href: pageHref(id) })).filter((l) => l.href || contentPreview);
  const rating = game.ageRating.verified ? `Rated PEGI ${game.ageRating.value.pegi} and ESRB ${game.ageRating.value.esrb}.` : null;

  return (
    <footer className="relative isolate overflow-hidden border-t border-warm/8 bg-obsidian">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[radial-gradient(60%_70%_at_50%_100%,rgb(255_155_98/0.16),rgb(255_87_154/0.06)_45%,transparent_75%)]" />
      <Glow tone="lavender" className="-left-56 -top-40 size-[40rem]" strength={0.1} speed={0.3} />

      <Container className="pt-20 lg:pt-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <a href={`${base}#overview`} className="inline-flex items-center gap-4" aria-label={`${site.name}, back to top`}>
              <Wordmark className="text-[2.25rem]" />
              <span aria-hidden className="h-7 w-px bg-warm/20" />
              <span className="text-xs leading-tight font-medium text-warm/55">
                Independent
                <br />
                retailer
              </span>
            </a>
            <p className="mt-6 max-w-[26rem] leading-relaxed text-warm/65">{site.description}</p>
            <dl className="mt-8 grid gap-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-warm/45">Platforms</dt>
                <dd className="text-warm/80">{platformList}</dd>
              </div>
              {rating && (
                <div className="flex gap-2">
                  <dt className="text-warm/45">Age rating</dt>
                  <dd className="text-warm/80">{rating}</dd>
                </div>
              )}
            </dl>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            <Column title="Explore">
              {site.nav.map((n) => (
                <FooterLink key={n.href} label={n.label} href={base + n.href} />
              ))}
            </Column>
            <Column title="Help">
              {checkoutAvailable && <FooterLink label="Order status" href="/order-status" />}
              <FooterLink label="Contact & support" href={supportHref} />
              <FooterLink label="About us" href={pageHref("about")} />
            </Column>
            {legal.length > 0 && (
              <Column title="Legal">
                {legal.map((l) => (
                  <FooterLink key={l.id} label={l.label} href={l.href} />
                ))}
              </Column>
            )}
          </nav>
        </div>
      </Container>

      {/* The page's closing image: the wordmark, cut by the bottom edge. */}
      <div className="mt-10 lg:mt-14">
        <p aria-hidden data-footer-mark className="footer-mark select-none text-center font-display leading-[0.74] font-extrabold tracking-[-0.01em] whitespace-nowrap uppercase">
          {site.name}
        </p>
      </div>

      <div className="border-t border-warm/8">
        <Container className="flex flex-col gap-4 py-6 text-xs leading-relaxed text-warm/45 md:flex-row md:items-start md:justify-between md:gap-10">
          <div className="max-w-[48rem]">
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-warm/65">
<span>
              © {year} {site.seller.legalName || site.name}.
              </span>
              <Link href="/credits" className={linkClass.replace("py-1 ", "")}>
                Media credits
              </Link>
            </p>
            <p className="mt-1">{site.disclaimer}</p>
          </div>
          <a href={`${base}#overview`} className={`${linkClass.replace("inline-block", "inline-flex")} shrink-0 items-center gap-2 text-sm`}>
            Back to top
            <ArrowUp aria-hidden className="size-4" />
          </a>
        </Container>
      </div>
    </footer>
  );
}

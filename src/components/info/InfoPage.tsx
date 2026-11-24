import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Layout";
import { type Block, type InfoPage as Page } from "@/config/legal";
import { getContent } from "@/server/content";
import { site, type PageId } from "@/config/site";
import { pageAvailable, pageIsDraft } from "@/lib/pages";

/** Metadata for an information page. Drafts are never indexed. */
export async function infoMetadata(id: PageId): Promise<Metadata> {
  const { pages, published } = await getContent();
  const p = pages[id];
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: site.pages[id].href },
    openGraph: { title: `${p.heading} | ${site.name}`, description: p.description, url: site.pages[id].href, type: "website" },
    twitter: { title: `${p.heading} | ${site.name}`, description: p.description },
    ...(pageIsDraft(id, published) && { robots: { index: false, follow: false } }),
  };
}

/** Text with {{markers}} for unconfirmed details, shown as visible "To confirm" chips. */
export function Rich({ text }: { text: string }) {
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    const m = /^\{\{(.+)\}\}$/.exec(part);
    return m ? (
      <mark key={i} data-pending className="mx-0.5 box-decoration-clone rounded-md bg-warning/12 px-1.5 py-0.5 text-[0.9em] text-warning-soft ring-1 ring-warning/25">
        To confirm: {m[1]}
      </mark>
    ) : (
      <Fragment key={i}>{linkEmail(part)}</Fragment>
    );
  });
}

/** The support address inside running text becomes a mailto link. */
function linkEmail(text: string): ReactNode {
  const email = site.support.email;
  if (!email || !text.includes(email)) return text;
  return text.split(email).flatMap((chunk, i) =>
    i === 0
      ? [chunk]
      : [
          <a key={i} href={`mailto:${email}`} className="font-medium text-sunset underline-offset-4 hover:underline">
            {email}
          </a>,
          chunk,
        ],
  );
}

export function BlockView({ block }: { block: Block }) {
  if (typeof block === "string")
    return (
      <p>
        <Rich text={block} />
      </p>
    );
  return (
    <ul className="grid gap-3">
      {block.list.map((item) => (
        <li key={item} className="relative pl-6 before:absolute before:top-[0.7em] before:left-0 before:h-px before:w-3 before:bg-sunset">
          <Rich text={item} />
        </li>
      ))}
    </ul>
  );
}

const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
const words = (p: Page) => [p.intro, ...p.sections.flatMap((s) => [s.heading, ...s.body.flatMap((b) => (typeof b === "string" ? [b] : b.list))])].join(" ").split(/\s+/).length;

/** Loads a page for rendering: 404 unless published (or a marked draft in local content preview). */
export async function loadInfoPage(id: PageId) {
  const { pages, published } = await getContent();
  if (!pageAvailable(id, published)) notFound();
  return { page: pages[id], draft: pageIsDraft(id, published), published };
}

/**
 * Shell shared by every information page: the page header (breadcrumb, title, intro, date; a CSS
 * entrance that never hides content without motion), structured data and the footer.
 */
export function InfoShell({
  id,
  page,
  draft,
  meta,
  aside,
  children,
}: {
  id: PageId;
  page: Page;
  draft: boolean;
  meta?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const url = new URL(site.pages[id].href, site.url).toString();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": page.schemaType,
      name: page.heading,
      description: page.description,
      url,
      inLanguage: site.locale,
      isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
      ...(page.updated && { dateModified: page.updated }),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: page.heading, item: url },
      ],
    },
  ];

  return (
    <>
      <main id="main" data-status={draft ? "draft" : undefined} className="relative isolate overflow-hidden bg-obsidian">
        <div aria-hidden className="bg-sunset-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] rotate-180 opacity-40" />
        <div aria-hidden className="grain pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] opacity-60" />
        <Container className="pt-28 pb-12 lg:pt-40 lg:pb-16">
          <div data-page-intro className={aside ? "grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8" : undefined}>
            <div className={aside ? "lg:col-span-7" : undefined}>
              <nav aria-label="Breadcrumb">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-warm/60 transition-colors hover:text-warm">
                  <ArrowLeft aria-hidden className="size-4" />
                  Back to the store
                </Link>
              </nav>
              <h1 className="mt-8 max-w-[16ch] font-display text-display-lg font-extrabold uppercase">{page.heading}</h1>
              <p className="mt-6 max-w-measure text-lead text-warm/75">
                <Rich text={page.intro} />
              </p>
              <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-warm/50">
                <span>{page.updated ? `Last updated ${dateText(page.updated)}` : "Not yet published"}</span>
                {meta}
              </p>
            </div>
            {aside && <div className="lg:col-span-5">{aside}</div>}
          </div>
        </Container>
        {children}
      </main>
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />
      ))}
      <Footer base="/" />
    </>
  );
}

/** "The short version": the policy's key points, beside the title. */
function Summary({ points }: { points: string[] }) {
  return (
    <section aria-labelledby="summary-h" className="rounded-media bg-midnight/80 p-6 ring-1 ring-warm/10 sm:p-7">
      <h2 id="summary-h" className="text-sm font-semibold text-sunset">
        The short version
      </h2>
      <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-warm/80">
        {points.map((p) => (
          <li key={p} className="relative pl-5 before:absolute before:top-[0.6em] before:left-0 before:size-1.5 before:rounded-full before:bg-vice">
            <Rich text={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const POLICIES: PageId[] = ["terms", "privacy", "refunds", "cookies"];

/**
 * Policy page (Terms, Privacy, Refunds, Cookies): the short version beside the title, a sticky
 * contents list, numbered sections that rise in on scroll, then related policies and how to ask.
 */
export async function InfoPage({ id }: { id: PageId }) {
  const { page, draft, published } = await loadInfoPage(id);
  const minutes = Math.max(1, Math.round(words(page) / 220));
  const related = POLICIES.filter((p) => p !== id && (published[p] || draft));
  const email = site.support.email;

  return (
    <InfoShell id={id} page={page} draft={draft} meta={<span>{minutes} min read</span>} aside={page.summary?.length ? <Summary points={page.summary} /> : undefined}>
      <Container className="pb-20 lg:pb-28">
        <div className="grid gap-10 border-t border-warm/10 pt-12 lg:grid-cols-12 lg:gap-8 lg:pt-16">
          <nav aria-labelledby="toc" className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <h2 id="toc" className="text-sm font-semibold text-warm/60">
                On this page
              </h2>
              <ol className="mt-3 grid gap-0.5 border-l border-warm/10 text-sm">
                {page.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-warm/60 transition-colors hover:border-sunset hover:text-warm">
                      {s.heading.replace(/^\d+\.\s*/, "")}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
          <article className="lg:col-span-8 lg:col-start-5">
            {page.sections.map((s) => {
              const [, num, title] = /^(\d+)\.\s*(.*)$/.exec(s.heading) ?? [null, null, s.heading];
              return (
                <Reveal key={s.id}>
                  <section id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28 border-b border-warm/8 py-9 first:pt-0 last:border-0">
                    <h2 id={`${s.id}-h`} className="flex items-baseline gap-4 text-title font-semibold tracking-tight">
                      {num && (
                        <span aria-hidden className="w-8 shrink-0 font-display text-2xl leading-none font-extrabold text-sunset/80 tabular-nums">
                          {num.padStart(2, "0")}
                        </span>
                      )}
                      <span>{title}</span>
                    </h2>
                    <div className={`mt-4 grid max-w-measure gap-4 leading-relaxed text-warm/75 ${num ? "sm:pl-12" : ""}`}>
                      {s.body.map((b, i) => (
                        <BlockView key={i} block={b} />
                      ))}
                    </div>
                  </section>
                </Reveal>
              );
            })}

            <Reveal className="mt-12 grid gap-4 sm:grid-cols-2">
              <div className="rounded-media bg-midnight/70 p-6 ring-1 ring-warm/10">
                <Mail aria-hidden className="size-5 text-sunset" />
                <p className="mt-4 font-semibold">Questions about this page?</p>
                <p className="mt-1 text-sm text-warm/65">We reply by email.</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {email && (
                    <a href={`mailto:${email}`} className="font-medium text-sunset underline-offset-4 hover:underline">
                      {email}
                    </a>
                  )}
                  {(published.contact || draft) && (
                    <Link href={site.pages.contact.href} className="inline-flex items-center gap-1.5 text-warm/80 hover:text-warm">
                      Contact form <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  )}
                </div>
              </div>
              {related.length > 0 && (
                <nav aria-label="Related policies" className="rounded-media p-6 ring-1 ring-warm/10">
                  <p className="font-semibold">Related policies</p>
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {related.map((p) => (
                      <li key={p}>
                        <Link href={site.pages[p].href} className="inline-flex items-center gap-1.5 text-warm/70 transition-colors hover:text-warm">
                          {site.pages[p].label} <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </Reveal>
          </article>
        </div>
      </Container>
    </InfoShell>
  );
}

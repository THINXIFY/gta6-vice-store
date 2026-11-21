import type { Metadata } from "next";
import { ArrowLeft, FileClock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Layout";
import { infoPages, pendingItems, type Block } from "@/config/legal";
import { site, type PageId } from "@/config/site";
import { pageAvailable, pageIsDraft } from "@/lib/pages";

/** Metadata for an information page. Drafts are never indexed. */
export function infoMetadata(id: PageId): Metadata {
  const p = infoPages[id];
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: site.pages[id].href },
    openGraph: { title: `${p.heading} | ${site.name}`, description: p.description, url: site.pages[id].href, type: "website" },
    ...(pageIsDraft(id) && { robots: { index: false, follow: false } }),
  };
}

/** Text with {{markers}} for unconfirmed details, shown as visible "To confirm" chips. */
function Rich({ text }: { text: string }) {
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    const m = /^\{\{(.+)\}\}$/.exec(part);
    return m ? (
      <mark key={i} data-pending className="mx-0.5 box-decoration-clone rounded-md bg-[#ffd400]/12 px-1.5 py-0.5 text-[0.9em] text-[#ffe680] ring-1 ring-[#ffd400]/25">
        To confirm: {m[1]}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === "string")
    return (
      <p>
        <Rich text={block} />
      </p>
    );
  return (
    <ul className="grid gap-2.5 pl-5 marker:text-sunset [list-style:disc]">
      {block.list.map((item) => (
        <li key={item} className="pl-1">
          <Rich text={item} />
        </li>
      ))}
    </ul>
  );
}

const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });

/**
 * Shared layout for About, Contact and the policy pages: title, intro, contents list,
 * numbered or plain sections and structured data. Unpublished pages 404 on the live site
 * and render as marked drafts (noindex) in content preview.
 */
export function InfoPage({ id, children }: { id: PageId; children?: ReactNode }) {
  if (!pageAvailable(id)) notFound();
  const page = infoPages[id];
  const draft = pageIsDraft(id);
  const pending = pendingItems(page);
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
        <div aria-hidden className="bg-sunset-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] rotate-180 opacity-40" />
        <Container className="pt-28 pb-10 lg:pt-40">
          <nav aria-label="Breadcrumb">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-warm/60 transition-colors hover:text-warm">
              <ArrowLeft aria-hidden className="size-4" />
              Back to the store
            </Link>
          </nav>
          <h1 className="mt-8 max-w-[18ch] font-display text-display-lg font-extrabold uppercase">{page.heading}</h1>
          <p className="mt-6 max-w-measure text-lead text-warm/75">{page.intro.includes("{{") ? <Rich text={page.intro} /> : page.intro}</p>
          <p className="mt-5 text-sm text-warm/50">{page.updated ? `Last updated ${dateText(page.updated)}` : "Not yet published"}</p>
          {draft && (
            <div role="note" className="mt-8 flex max-w-measure gap-3 rounded-2xl border border-[#ffd400]/25 bg-[#ffd400]/[0.06] p-4 text-sm text-[#ffe680]">
              <FileClock aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>
                Draft preview. This page is not published and is hidden from search engines.{" "}
                {pending.length > 0 ? `${pending.length} ${pending.length === 1 ? "detail needs" : "details need"} confirming before it can go live.` : "Ready for review."}
              </p>
            </div>
          )}
        </Container>

        {children}

        <Container className="pb-24 lg:pb-32">
          <div className="grid gap-10 border-t border-warm/10 pt-12 lg:grid-cols-12 lg:gap-8 lg:pt-16">
            {page.sections.length > 2 && (
              <nav aria-labelledby="toc" className="lg:col-span-3">
                <div className="lg:sticky lg:top-28">
                  <h2 id="toc" className="text-sm font-semibold text-warm/60">
                    On this page
                  </h2>
                  <ol className="mt-3 grid gap-1 text-sm">
                    {page.sections.map((s) => (
                      <li key={s.id}>
                        <a href={`#${s.id}`} className="block rounded-md py-1 text-warm/65 transition-colors hover:text-warm">
                          {s.heading.replace(/^\d+\.\s*/, "")}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              </nav>
            )}
            <article className={page.sections.length > 2 ? "lg:col-span-8 lg:col-start-5" : "lg:col-span-8"}>
              {page.sections.map((s) => (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28 border-b border-warm/8 py-8 first:pt-0 last:border-0">
                  <h2 id={`${s.id}-h`} className="text-title font-semibold tracking-tight">
                    {s.heading}
                  </h2>
                  <div className="mt-4 grid max-w-measure gap-4 leading-relaxed text-warm/75">
                    {s.body.map((b, i) => (
                      <BlockView key={i} block={b} />
                    ))}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </Container>
      </main>
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />
      ))}
      <Footer base="/" />
    </>
  );
}

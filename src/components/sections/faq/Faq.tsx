import { ArrowRight, MessageCircleQuestion, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { codeInBoxArt } from "@/config/media";
import { faqGroups, type FaqItem } from "@/config/policies";
import { site } from "@/config/site";
import { checkoutAvailable } from "@/lib/checkout";
import { contentPreview, isUsable } from "@/lib/media";
import { pageHref } from "@/lib/pages";
import { getContent } from "@/server/content";

const applies = (f: FaqItem) => !f.requires || checkoutAvailable;

/** Answers published on this build (also the FAQPage structured data): verified, and relevant now. */
export const publishedFaq = (faq: FaqItem[]) => faq.filter((f) => f.status === "verified" && applies(f));

/** Shown on this build: published answers, plus drafts in local content preview. */
export const visibleFaq = (faq: FaqItem[]) => (contentPreview ? faq : publishedFaq(faq));

/** Plain-language source label, e.g. "Rockstar Support" from "support.rockstargames.com/…". */
function sourceLabel(source?: string) {
  if (!source) return null;
  if (source.includes("support.rockstargames.com")) return "Rockstar Support";
  if (source.includes("store.rockstargames.com")) return "Rockstar Store";
  if (source.includes("rockstargames.com")) return "Rockstar Games";
  return source.replace(/\s*\(.*\)$/, "").split(",")[0];
}

/**
 * FAQ grouped by topic on native <details>/<summary>: keyboard and screen-reader support
 * built in, every answer in the HTML for search and answer engines, each answer led by a
 * direct sentence and its source. Drafts carry data-status="draft" and only render in preview.
 */
export async function Faq() {
  // Questions, wording and publish state from Admin → Content (server only: drafts never reach the browser).
  const { faq, copy, published } = await getContent();
  const faqCopy = copy.faq;
  const shown = visibleFaq(faq);
  if (!shown.length) return null;
  const groups = faqGroups.map((g) => ({ ...g, items: shown.filter((f) => f.group === g.id) })).filter((g) => g.items.length);
  const contact = pageHref("contact", published) || (site.support.email ? `mailto:${site.support.email}` : "");

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative isolate overflow-hidden bg-obsidian py-section">
      <Glow tone="lavender" className="-left-64 top-[18%] size-[46rem]" strength={0.12} speed={0.45} />
      <Glow tone="electric" className="-right-48 bottom-[10%] size-[34rem]" strength={0.08} speed={0.3} />
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Display reveal as="h2" id="faq-title" size="md" caps={false} className="tracking-[-0.005em]">
              {faqCopy.heading}
            </Display>
            <p className="mt-5 max-w-[22rem] leading-relaxed text-warm/65">{faqCopy.intro}</p>

            {groups.length > 1 && (
              <nav aria-label="FAQ topics" className="mt-8 flex flex-wrap gap-2">
                {groups.map((g) => (
                  <a
                    key={g.id}
                    href={`#faq-topic-${g.id}`}
                    className="inline-flex items-center gap-2 rounded-control border border-warm/12 px-4 py-2 text-sm font-medium text-warm/80 transition-colors hover:border-sunset/50 hover:text-warm"
                  >
                    {g.label}
                    <span className="text-xs text-warm/45 tabular-nums">{g.items.length}</span>
                  </a>
                ))}
              </nav>
            )}

            {contact && (
              <div className="mt-10 hidden max-w-[22rem] rounded-media border border-warm/10 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-lavender)_10%,transparent),transparent_65%)] p-6 lg:block">
                <MessageCircleQuestion aria-hidden className="size-5 text-lavender" strokeWidth={1.75} />
                <p className="mt-4 font-semibold">Still have a question?</p>
                <p className="mt-1.5 text-sm leading-relaxed text-warm/60">Send us a message and include your Payment ID if you have one.</p>
                <Link href={contact} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sunset transition-[gap] duration-300 hover:gap-2.5">
                  Contact us
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-12 lg:col-span-8">
          {groups.map((g) => (
            <div key={g.id} id={`faq-topic-${g.id}`} className="scroll-mt-28">
              <h3 className="mb-4 flex items-baseline gap-3 text-sm font-semibold text-warm/55">
                {g.label}
                <span aria-hidden className="h-px flex-1 translate-y-[-0.2em] bg-linear-to-r from-warm/15 to-transparent" />
              </h3>
              <div className="grid gap-3">
                {g.items.map((item) => {
                  const source = item.status === "verified" ? sourceLabel(item.source) : null;
                  return (
                    <details
                      key={item.id}
                      id={`faq-${item.id}`}
                      data-status={item.status}
                      className="faq group rounded-2xl border border-warm/10 bg-warm/[0.025] transition-[border-color,background-color] duration-500 hover:border-warm/20 open:border-sunset/30 open:bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-sunset)_7%,transparent),rgb(255_255_255/0.015)_55%)]"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-5 rounded-2xl px-5 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sunset sm:px-6 [&::-webkit-details-marker]:hidden">
                        <h4 className="text-[1.0625rem] leading-snug font-semibold text-warm/90 transition-colors group-open:text-warm group-hover:text-warm sm:text-lg">{item.question}</h4>
                        <span
                          aria-hidden
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-warm/[0.06] text-sunset ring-1 ring-warm/10 transition-[background-color,color] duration-300 group-open:bg-sunset group-open:text-obsidian"
                        >
                          <Plus className="size-4 transition-transform duration-300 ease-cinematic group-open:rotate-45" />
                        </span>
                      </summary>
                      <div className="faq-answer flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-start sm:gap-7 sm:px-6">
                        {item.id === "code-in-box" && isUsable(codeInBoxArt) && (
                          <Image
                            src={codeInBoxArt.src}
                            alt={codeInBoxArt.alt}
                            width={codeInBoxArt.width}
                            height={codeInBoxArt.height}
                            sizes="7rem"
                            className="w-24 shrink-0 rounded-md shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] sm:w-28"
                          />
                        )}
                        <div>
                          <p className="max-w-[46rem] leading-relaxed text-warm/72">{item.answer}</p>
                          {source && <p className="mt-3 text-xs text-warm/40">Source: {source}</p>}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

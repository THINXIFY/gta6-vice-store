import { Plus } from "lucide-react";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { faqCopy } from "@/config/content";
import { faq } from "@/config/policies";
import Image from "next/image";
import { codeInBoxArt } from "@/config/media";
import { contentPreview, isUsable } from "@/lib/media";

/** Questions shown on this build: verified always, drafts only in local content preview. */
export const visibleFaq = faq.filter((f) => f.status === "verified" || contentPreview);

/**
 * Server-rendered FAQ on native <details>/<summary>: keyboard and screen-reader support
 * built in, and every answer is in the HTML for search and answer engines.
 * Draft answers carry data-status="draft" (no visible label) and only render in content preview.
 */
export function Faq() {
  if (!visibleFaq.length) return null;

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative isolate bg-obsidian py-section">
      <Glow tone="lavender" className="-left-64 top-[18%] size-[46rem]" strength={0.12} speed={0.45} />
      <Glow tone="electric" className="-right-48 bottom-[10%] size-[34rem]" strength={0.08} speed={0.3} />
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <Display reveal as="h2" id="faq-title" size="md" caps={false} className="tracking-[-0.005em] lg:sticky lg:top-28">
            {faqCopy.heading}
          </Display>
        </div>

        <div className="border-t border-warm/10 lg:col-span-8">
          {visibleFaq.map((item) => (
            <details key={item.id} id={`faq-${item.id}`} data-status={item.status} className="faq group border-b border-warm/10">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
                <h3 className="text-lg leading-snug font-semibold transition-colors group-hover:text-white sm:text-xl">
                  {item.question}
                </h3>
                <Plus aria-hidden className="mt-1 size-5 shrink-0 text-sunset transition-transform duration-300 ease-cinematic group-open:rotate-45" />
              </summary>
              <div className="faq-answer flex flex-col gap-5 pb-7 sm:flex-row sm:items-start sm:gap-7">
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
                <p className="max-w-[46rem] leading-relaxed text-warm/72">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

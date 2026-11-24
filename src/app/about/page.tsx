import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { BlockView, InfoShell, Rich, infoMetadata, loadInfoPage } from "@/components/info/InfoPage";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Layout";
import type { Section } from "@/config/legal";
import { site } from "@/config/site";

export const generateMetadata = () => infoMetadata("about");

const texts = (s?: Section) => s?.body.flatMap((b) => (typeof b === "string" ? [b] : [])) ?? [];
const items = (s?: Section) => s?.body.flatMap((b) => (typeof b === "string" ? [] : b.list)) ?? [];

/**
 * About: a statement, the three steps of buying (a real sequence, so numbered), what the store
 * stands for, and a way to get in touch. Sections come from Admin → Content; any section added
 * there that this layout does not know renders as plain text, so nothing is lost.
 */
export default async function AboutPage() {
  const { page, draft, published } = await loadInfoPage("about");
  const byId = Object.fromEntries(page.sections.map((s) => [s.id, s]));
  const [what, steps, values, talk] = [byId["what-we-do"], byId["how-we-work"], byId["principles"], byId["talk-to-us"]];
  const other = page.sections.filter((s) => ![what, steps, values, talk].includes(s));
  const email = site.support.email;

  return (
    <InfoShell id="about" page={page} draft={draft}>
      {what && (
        <Container className="pb-20 lg:pb-28">
          <Reveal className="grid gap-8 border-t border-warm/10 pt-12 lg:grid-cols-12 lg:gap-8 lg:pt-16">
            <h2 className="font-display text-display-md font-extrabold uppercase lg:col-span-4">{what.heading}</h2>
            <div className="grid gap-5 text-lead leading-relaxed text-warm/75 lg:col-span-7 lg:col-start-6">
              {texts(what).map((t) => (
                <p key={t}>
                  <Rich text={t} />
                </p>
              ))}
            </div>
          </Reveal>
        </Container>
      )}

      {steps && items(steps).length > 0 && (
        <section aria-labelledby="steps-h" className="relative border-y border-warm/8 bg-midnight/50 py-20 lg:py-28">
          <Container>
            <h2 id="steps-h" className="font-display text-display-md font-extrabold uppercase">
              {steps.heading}
            </h2>
            <Reveal className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {items(steps).map((step, i) => (
                <div key={step} className="relative border-t border-warm/15 pt-6">
                  <span aria-hidden className="text-sunset font-display text-[clamp(3rem,2rem+3vw,4.5rem)] leading-none font-extrabold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-5 leading-relaxed text-warm/80">
                    <span className="sr-only">Step {i + 1}: </span>
                    <Rich text={step} />
                  </p>
                </div>
              ))}
            </Reveal>
          </Container>
        </section>
      )}

      {values && (
        <Container className="py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <h2 className="font-display text-display-md font-extrabold uppercase lg:col-span-4">{values.heading}</h2>
            <Reveal className="grid gap-px overflow-hidden rounded-media bg-warm/10 sm:grid-cols-2 lg:col-span-8">
              {items(values).map((v) => {
                const [lead, ...rest] = v.split(": ");
                return (
                  <div key={v} className="bg-obsidian p-6 sm:p-7">
                    {rest.length ? (
                      <>
                        <p className="text-lg font-semibold">{lead}</p>
                        <p className="mt-2 leading-relaxed text-warm/70">{rest.join(": ")}</p>
                      </>
                    ) : (
                      <p className="leading-relaxed text-warm/75">{v}</p>
                    )}
                  </div>
                );
              })}
            </Reveal>
          </div>
        </Container>
      )}

      {other.length > 0 && (
        <Container className="pb-20">
          {other.map((s) => (
            <Reveal key={s.id} className="grid gap-4 border-t border-warm/10 py-10 lg:grid-cols-12 lg:gap-8">
              <h2 className="text-title font-semibold lg:col-span-4">{s.heading}</h2>
              <div className="grid max-w-measure gap-4 leading-relaxed text-warm/75 lg:col-span-8">
                {s.body.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </div>
            </Reveal>
          ))}
        </Container>
      )}

      <Container className="pb-24 lg:pb-32">
        <Reveal className="relative overflow-hidden rounded-media bg-dusk px-6 py-12 ring-1 ring-warm/10 sm:px-12 sm:py-16">
          <div aria-hidden className="bg-sunset-glow pointer-events-none absolute inset-x-0 bottom-0 h-2/3 opacity-60" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-display-md font-extrabold uppercase">{talk?.heading ?? "Talk to us"}</h2>
            {texts(talk).map((t) => (
              <p key={t} className="mt-4 text-lead text-warm/80">
                <Rich text={t} />
              </p>
            ))}
            <div className="mt-8 flex flex-wrap gap-3">
              {(published.contact || draft) && (
                <Link href={site.pages.contact.href} className="inline-flex h-12 items-center gap-2 rounded-control bg-warm px-6 font-semibold text-obsidian transition-colors hover:bg-warm/90">
                  Contact us <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
              <Link href={`/${site.purchaseHref}`} className="inline-flex h-12 items-center gap-2 rounded-control px-6 font-semibold text-warm ring-1 ring-warm/25 transition-colors hover:bg-warm/[0.06]">
                Compare editions
              </Link>
              {email && (
                <a href={`mailto:${email}`} className="inline-flex h-12 items-center gap-2 px-2 text-sm text-warm/75 hover:text-warm">
                  <Mail aria-hidden className="size-4" /> {email}
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </Container>
    </InfoShell>
  );
}

import { ArrowRight, ChevronDown, Mail, PackageSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ContactForm } from "@/components/info/ContactForm";
import { BlockView, InfoShell, infoMetadata, loadInfoPage } from "@/components/info/InfoPage";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Layout";
import { site } from "@/config/site";

export const generateMetadata = () => infoMetadata("contact");

/**
 * Contact: the form (saved to Admin → Support; an email alert is sent only when SMTP is set up),
 * the support address, order tracking and a safety note, then quick answers (sections from
 * Admin → Content, shown as an accordion).
 */
export default async function ContactPage() {
  const { page, draft, published } = await loadInfoPage("contact");
  const email = site.support.email;

  return (
    <InfoShell id="contact" page={page} draft={draft}>
      <Container className="pb-16 lg:pb-24">
        <div className="grid gap-10 border-t border-warm/10 pt-12 lg:grid-cols-12 lg:gap-8 lg:pt-16">
          <section aria-labelledby="form-h" className="lg:col-span-7">
            <h2 id="form-h" className="text-title font-semibold">
              Send us a message
            </h2>
            <p className="mt-2 text-sm text-warm/60">We reply by email to the address you give us.</p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </section>

          <aside aria-label="Other ways to get help" className="grid content-start gap-4 lg:col-span-4 lg:col-start-9">
            {email && (
              <div className="rounded-media p-6 ring-1 ring-warm/10">
                <Mail aria-hidden className="size-5 text-sunset" />
                <p className="mt-4 font-semibold">Email</p>
                <a href={`mailto:${email}`} className="mt-1 block break-all text-lg font-medium text-sunset underline-offset-4 hover:underline">
                  {email}
                </a>
                <p className="mt-2 text-sm text-warm/60">Include your Payment ID if you have one.</p>
              </div>
            )}
            <Link href="/order-status" className="group rounded-media p-6 ring-1 ring-warm/10 transition-colors hover:bg-warm/[0.03]">
              <PackageSearch aria-hidden className="size-5 text-sunset" />
              <p className="mt-4 flex items-center gap-2 font-semibold">
                Track your order <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="mt-1 text-sm text-warm/60">See your order&apos;s progress with your Payment ID and email.</p>
            </Link>
            <div className="rounded-media bg-success/[0.05] p-6 ring-1 ring-success/20">
              <ShieldCheck aria-hidden className="size-5 text-success-soft" />
              <p className="mt-4 font-semibold">Stay safe</p>
              <p className="mt-1 text-sm leading-relaxed text-warm/70">We never ask for your wallet&apos;s private key, recovery phrase or console password.</p>
            </div>
          </aside>
        </div>
      </Container>

      {page.sections.length > 0 && (
        <section aria-labelledby="faq-h" className="border-t border-warm/8 bg-midnight/40 py-16 lg:py-24">
          <Container className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <h2 id="faq-h" className="font-display text-display-md font-extrabold uppercase">
                Quick answers
              </h2>
              {(published.refunds || draft) && (
                <Link href={site.pages.refunds.href} className="mt-5 inline-flex items-center gap-1.5 text-sm text-warm/70 hover:text-warm">
                  Refund &amp; Cancellation Policy <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              )}
            </div>
            <Reveal className="divide-y divide-warm/10 border-y border-warm/10 lg:col-span-8">
              {page.sections.map((s) => (
                <details key={s.id} id={s.id} className="group scroll-mt-28">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-semibold [&::-webkit-details-marker]:hidden">
                    {s.heading}
                    <ChevronDown aria-hidden className="size-5 shrink-0 text-warm/50 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid max-w-measure gap-3 pb-6 leading-relaxed text-warm/75">
                    {s.body.map((b, i) => (
                      <BlockView key={i} block={b} />
                    ))}
                  </div>
                </details>
              ))}
            </Reveal>
          </Container>
        </section>
      )}
    </InfoShell>
  );
}

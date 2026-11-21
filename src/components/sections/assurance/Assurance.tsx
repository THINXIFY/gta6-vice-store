import { ArrowRight, Gamepad2, Gem, ScanEye, type LucideIcon } from "lucide-react";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { getCopy } from "@/server/content";
import type { Assurance } from "@/config/policies";
import { editionsLine, type Catalog } from "@/lib/catalog";
import { getCatalog } from "@/server/catalog";
import { checkoutAvailable } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { AssuranceMotion } from "./AssuranceMotion";

/** Verified reassurance lines for the purchase panel (Admin → Content; platforms are shown there already). */
export const purchaseNotes = (notes: Assurance[]) => notes.filter((a) => a.status === "verified" && a.id !== "platforms").map((a) => a.body);

type Tone = "vice" | "sunset" | "lavender" | "electric";
/** Card tones: theme colours (src/brand), plus one fixed cool blue for variety. */
const TONES: Record<Tone, { color: string; text: string }> = {
  vice: { color: "var(--color-vice)", text: "text-vice" },
  sunset: { color: "var(--color-sunset)", text: "text-sunset" },
  lavender: { color: "var(--color-lavender)", text: "text-lavender" },
  electric: { color: "#4cc9ff", text: "text-[#4cc9ff]" },
};

type Card = { id: string; icon: LucideIcon; tone: Tone; title: string; big: string; body: string; link?: { href: string; label: string } };

/**
 * The 3–4 things worth knowing, each built only from confirmed facts:
 * verified platforms, the verified edition contents, how the store's checkout actually works
 * (shown only while checkout is available).
 */
function cards(catalog: Catalog, compareLink: boolean): Card[] {
  const live = catalog.platforms.filter((p) => p.available);
  const editions = editionsLine(catalog);
  const list: (Card | null)[] = [
    live.length
      ? {
          id: "platforms",
          icon: Gamepad2,
          tone: "electric",
          title: "Platform compatibility",
          big: live.map((p) => p.shortName).join(" & "),
          body: `${catalog.product.title} is available on ${new Intl.ListFormat("en", { type: "conjunction" }).format(live.map((p) => p.name))}. Choose your platform before you buy.`,
        }
      : null,
    editions
      ? {
          id: "editions",
          icon: Gem,
          tone: "sunset",
          title: "Know what you get",
          big: `+${editions.extras} extras`,
          body: `${editions.text} See exactly what each edition includes.`,
          ...(compareLink && { link: { href: "#compare", label: "Compare editions" } }),
        }
      : null,
    checkoutAvailable
      ? {
          id: "verification",
          icon: ScanEye,
          tone: "lavender",
          title: "Checked by a person",
          big: "Never automatic",
          body: "Every crypto payment is verified on the blockchain by our team before your game is released. Nothing is approved automatically.",
        }
      : null,
  ];
  return list.filter((c): c is Card => c !== null);
}

/** "Good to know before you buy": three or four confirmed essentials as tonal cards. */
export async function Assurance({ compareLink = true }: { compareLink?: boolean }) {
  // Wording from Admin → Content (defaults in src/config/content.ts).
  const copy = await getCopy();
  const assuranceCopy = copy.assurance;
  const items = cards(await getCatalog(), compareLink);
  if (!items.length) return null;

  return (
    <AssuranceMotion>
      <section id="how-it-works" aria-labelledby="assurance-title" className="relative isolate overflow-hidden bg-band py-[clamp(4.5rem,3rem+6vw,8.5rem)]">
        <Glow tone="sunset" className="-right-56 -top-16 size-[44rem]" strength={0.12} speed={0.45} />
        <Glow tone="lavender" className="-bottom-64 -left-48 size-[40rem]" strength={0.1} speed={0.3} />
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:sticky lg:top-32 lg:col-span-4 lg:self-start">
              <Display reveal as="h2" id="assurance-title" size="md" caps={false} className="tracking-[-0.005em]">
                {assuranceCopy.headingWithoutSteps}
              </Display>
              <p className="mt-5 max-w-[22rem] leading-relaxed text-warm/65">{assuranceCopy.intro}</p>
            </div>

            <ul className={cn("grid gap-4 sm:grid-cols-2 sm:gap-5 lg:col-span-8", items.length === 3 && "lg:[&>li:first-child]:col-span-2")}>
              {items.map((c) => {
                const tone = TONES[c.tone];
                return (
                  <li
                    key={c.id}
                    data-card
                    style={{ "--tone": tone.color } as React.CSSProperties}
                    className="group relative isolate flex flex-col overflow-hidden rounded-media border border-warm/10 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-midnight)_92%,transparent),color-mix(in_oklab,var(--color-obsidian)_96%,transparent))] p-6 transition-[transform,border-color,box-shadow] duration-500 ease-cinematic hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--tone)_35%,transparent)] hover:shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--tone)_55%,transparent)] sm:p-7"
                  >
                    {/* Tonal hairline, corner glow and an oversized faint icon: depth without noise. */}
                    <span aria-hidden data-card-line className="absolute inset-x-6 top-0 h-px origin-left bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--tone)_90%,transparent),transparent)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
                    <span aria-hidden className="absolute -top-20 -right-20 -z-10 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--tone)_22%,transparent),transparent_68%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
                    <c.icon aria-hidden strokeWidth={1} className="absolute -right-8 -bottom-10 -z-10 size-44 -rotate-12 text-warm/[0.045] transition-transform duration-700 ease-cinematic group-hover:-rotate-6 group-hover:scale-105" />

                    <div className="flex items-center gap-3">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tone)_12%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--tone)_28%,transparent)]", tone.text)}>
                        <c.icon aria-hidden className="size-[1.15rem]" strokeWidth={1.75} />
                      </span>
                      <h3 className="text-[0.9375rem] font-semibold text-warm/85">{c.title}</h3>
                    </div>
                    <p className="mt-9 font-display text-[clamp(2rem,1.6rem+1.5vw,3rem)] leading-[0.92] font-extrabold tracking-[-0.005em] uppercase">{c.big}</p>
                    <p className="mt-3 max-w-[30rem] text-sm leading-relaxed text-warm/65">{c.body}</p>
                    {c.link && (
                      <a href={c.link.href} className={cn("mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold transition-[gap] duration-300 hover:gap-2.5", tone.text)}>
                        {c.link.label}
                        <ArrowRight aria-hidden className="size-4" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>
    </AssuranceMotion>
  );
}

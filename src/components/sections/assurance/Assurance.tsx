import { BadgeCheck, Gamepad2, Globe, LifeBuoy, Lock, Send, Store, Undo2, type LucideIcon } from "lucide-react";
import { Container, Display } from "@/components/ui/Layout";
import { Glow } from "@/components/ui/Atmosphere";
import { assuranceCopy } from "@/config/content";
import { assurances, steps, type Assurance as AssuranceItem } from "@/config/policies";
import { contentPreview } from "@/lib/media";
import { cn } from "@/lib/utils";
import { AssuranceMotion } from "./AssuranceMotion";

const ICONS: Record<AssuranceItem["icon"], LucideIcon> = {
  lock: Lock,
  badge: BadgeCheck,
  send: Send,
  console: Gamepad2,
  globe: Globe,
  help: LifeBuoy,
  undo: Undo2,
  store: Store,
};

const visible = <T extends { status: "verified" | "draft" }>(list: T[]) => list.filter((i) => i.status === "verified" || contentPreview);

/** Steps publish only as a complete, confirmed sequence; partial flows stay in preview. */
const shownSteps = steps.every((s) => s.status === "verified") || contentPreview ? steps : [];
const shownAssurances = visible(assurances);

/** Verified reassurance lines for the purchase panel (platform and retailer status are shown there already). */
export const purchaseNotes = assurances
  .filter((a) => a.status === "verified" && a.id !== "platforms" && a.id !== "independent")
  .map((a) => a.body);

function AssuranceList({ items, className }: { items: AssuranceItem[]; className?: string }) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-9 sm:grid-cols-2", className)}>
      {items.map((a) => {
        const Icon = ICONS[a.icon];
        return (
          <li key={a.id} data-status={a.status} className="max-w-[24rem]">
            <Icon aria-hidden className="size-5 text-sunset" strokeWidth={1.75} />
            <h3 className="mt-4 font-semibold">{a.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-warm/60">{a.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "How it works" + "Good to know". Server-rendered from server-only policy config; only
 * confirmed steps and capabilities reach a production build.
 */
export function Assurance() {
  if (!shownSteps.length && !shownAssurances.length) return null;
  const hasSteps = shownSteps.length > 0;

  return (
    <AssuranceMotion>
      <section
        id="how-it-works"
        aria-labelledby="assurance-title"
        className={cn("relative isolate bg-band", hasSteps ? "py-section" : "py-[clamp(4rem,2.5rem+6vw,8rem)]")}
      >
        <Glow tone="sunset" className="-right-56 -top-16 size-[44rem]" strength={0.12} speed={0.45} />
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <Display reveal as="h2" id="assurance-title" size="md" caps={false} className="tracking-[-0.005em] lg:col-span-4">
              {hasSteps ? assuranceCopy.heading : assuranceCopy.headingWithoutSteps}
            </Display>

            {hasSteps && (
              <ol className="grid gap-10 md:grid-cols-3 md:gap-8 lg:col-span-8">
                {shownSteps.map((s, i) => (
                  <li key={s.id} data-step data-status={s.status} className="relative pl-16 md:pl-0">
                    <div className="absolute top-0 left-0 md:relative md:flex md:items-center md:gap-4">
                      <span
                        data-step-number
                        aria-hidden
                        className="block font-display text-[clamp(2.75rem,2rem+2.4vw,4.5rem)] leading-[0.8] font-extrabold text-transparent tabular-nums [-webkit-text-stroke:1.5px_var(--color-sunset)]"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {i < shownSteps.length - 1 && (
                        <span aria-hidden data-step-line className="hidden h-px flex-1 origin-left bg-linear-to-r from-sunset/60 to-warm/10 md:block" />
                      )}
                    </div>
                    {i < shownSteps.length - 1 && (
                      <span aria-hidden data-step-line className="absolute top-14 bottom-[-2.5rem] left-[1.15rem] w-px origin-top bg-linear-to-b from-sunset/50 to-warm/10 md:hidden" />
                    )}
                    <h3 className="text-xl leading-snug font-semibold md:mt-6">
                      <span className="sr-only">Step {i + 1}: </span>
                      {s.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-warm/65">{s.body}</p>
                  </li>
                ))}
              </ol>
            )}
            {!hasSteps && <AssuranceList items={shownAssurances} className="lg:col-span-8" />}
          </div>

          {hasSteps && shownAssurances.length > 0 && (
            <div className="mt-16 border-t border-warm/10 pt-10 lg:mt-24 lg:pt-14">
              <p className="text-sm font-semibold text-warm/55">{assuranceCopy.assurancesLabel}</p>
              <AssuranceList items={shownAssurances} className="mt-8 lg:grid-cols-4" />
            </div>
          )}
        </Container>
      </section>
    </AssuranceMotion>
  );
}

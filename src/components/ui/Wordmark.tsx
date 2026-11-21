import { site } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * VICE STORE wordmark: condensed display caps, first word in white, second in the sunset
 * gradient. Size it with a text-* class; it reads as one word to assistive technology.
 */
export function Wordmark({ className }: { className?: string }) {
  const [first, second] = site.wordmark;
  return (
    <span className={cn("inline-flex items-baseline gap-[0.26em] font-display leading-none font-extrabold tracking-[0.05em] whitespace-nowrap uppercase", className)}>
      <span className="text-warm">{first}</span>
      <span className="bg-[linear-gradient(100deg,var(--color-vice)_0%,var(--color-blend)_45%,var(--color-sunset)_100%)] bg-clip-text pr-[0.04em] text-transparent">{second}</span>
    </span>
  );
}

import { brand } from "@/brand/brand";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * The store's logo (brand.logo: WebP with a PNG fallback, built by `npm run brand:assets`).
 * Size it with a text-* class: the logo is 1.6em tall, so existing sizes keep their rhythm.
 * `priority` loads it first (the header). Without a logo: the typeset wordmark, first word in
 * white, second in the sunset gradient. Either way it reads as the store name.
 */
export function Wordmark({ className, priority }: { className?: string; priority?: boolean }) {
  const logo = brand.logo;
  if (logo) {
    return (
      <picture className={cn("inline-flex shrink-0 leading-none", className)}>
        <source srcSet={logo.webp} type="image/webp" />
        {/* Pre-optimised static logo (WebP + PNG): next/image would only re-encode it. */}
        <img
          src={logo.png}
          alt={site.name}
          width={logo.width}
          height={logo.height}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          loading={priority ? "eager" : "lazy"}
          className="h-[1.6em] w-auto max-w-none select-none drop-shadow-[0_2px_10px_color-mix(in_oklab,var(--color-vice)_22%,transparent)]"
          draggable={false}
        />
      </picture>
    );
  }
  const [first, second] = site.wordmark;
  return (
    <span className={cn("inline-flex items-baseline gap-[0.26em] font-display leading-none font-extrabold tracking-[0.05em] whitespace-nowrap uppercase", className)}>
      <span className="text-warm">{first}</span>
      <span className="bg-[linear-gradient(100deg,var(--color-vice)_0%,var(--color-blend)_45%,var(--color-sunset)_100%)] bg-clip-text pr-[0.04em] text-transparent">{second}</span>
    </span>
  );
}

import Link from "next/link";
import { site } from "@/config/site";
import { pageHref } from "@/lib/pages";

const L = ({ href, children }: { href: string; children: string }) => (
  <Link href={href} className="text-warm/80 underline decoration-warm/30 underline-offset-4 hover:text-warm hover:decoration-sunset">
    {children}
  </Link>
);

/** Policy links shown before payment. Only published pages (or drafts in preview) are linked. */
export function PolicyLinks({ className }: { className?: string }) {
  const terms = pageHref("terms");
  const refunds = pageHref("refunds");
  const privacy = pageHref("privacy");
  if (!terms && !refunds && !privacy) return null;
  return (
    <p className={className}>
      {(terms || refunds) && (
        <>
          By continuing you agree to our {terms && <L href={terms}>{site.pages.terms.label}</L>}
          {terms && refunds && " and "}
          {refunds && <L href={refunds}>{site.pages.refunds.label}</L>}.{" "}
        </>
      )}
      {privacy && (
        <>
          Read how we handle your data in our <L href={privacy}>{site.pages.privacy.label}</L>.
        </>
      )}
    </p>
  );
}

import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { defaultEdition, defaultPlatform, editions, platforms } from "@/config/product";
import type { EditionId, PlatformId } from "@/config/types";
import { getCatalog } from "@/server/catalog";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

type Search = Promise<{ edition?: string; platform?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: Search }) {
  const [q, catalog] = await Promise.all([searchParams, getCatalog()]);
  const edition = (editions.some((e) => e.id === q.edition) ? q.edition : defaultEdition) as EditionId;
  const platform = (platforms.some((p) => p.id === q.platform) ? q.platform : defaultPlatform) as PlatformId;

  return (
    <CheckoutShell eyebrow="Secure guest checkout" title="Checkout" back={{ href: "/#editions", label: "Back to editions" }}>
      <CheckoutForm initialEdition={edition} initialPlatform={platform} catalog={catalog} />
    </CheckoutShell>
  );
}

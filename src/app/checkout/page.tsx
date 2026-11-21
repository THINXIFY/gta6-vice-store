import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { defaultEdition, defaultPlatform } from "@/config/product";
import type { EditionId, PlatformId } from "@/config/types";
import { getCatalog } from "@/server/catalog";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false }, alternates: { canonical: "/checkout" } };

type Search = Promise<{ edition?: string; platform?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: Search }) {
  const [q, catalog] = await Promise.all([searchParams, getCatalog()]);
  // The requested edition/platform if it is in the live catalogue, else the default, else the first.
  const pick = (want: string | undefined, fallback: string, ids: string[]) => (want && ids.includes(want) ? want : ids.includes(fallback) ? fallback : ids[0]!);
  const edition: EditionId = pick(q.edition, defaultEdition, catalog.editions.map((e) => e.id));
  const platform: PlatformId = pick(q.platform, defaultPlatform, catalog.platforms.filter((p) => p.available).map((p) => p.id));

  return (
    <CheckoutShell eyebrow="Secure guest checkout" title="Checkout" back={{ href: "/#editions", label: "Back to editions" }} stage={1}>
      <CheckoutForm initialEdition={edition} initialPlatform={platform} catalog={catalog} />
    </CheckoutShell>
  );
}

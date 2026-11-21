import type { Metadata } from "next";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { PaymentInvoice } from "@/components/checkout/PaymentInvoice";

export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false }, alternates: { canonical: "/checkout/payment" } };

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id = "" } = await searchParams;
  return (
    <CheckoutShell eyebrow="Manual crypto payment" title="Complete your payment" back={{ href: "/checkout", label: "Back to checkout" }} stage={2}>
      <PaymentInvoice paymentId={id} />
    </CheckoutShell>
  );
}

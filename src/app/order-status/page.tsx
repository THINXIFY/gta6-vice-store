import type { Metadata } from "next";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { OrderStatusView } from "@/components/checkout/OrderStatus";

export const metadata: Metadata = { title: "Order status", robots: { index: false, follow: false } };

export default async function OrderStatusPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id = "" } = await searchParams;
  return (
    <CheckoutShell eyebrow="Track your order" title="Order status" intro="Enter your Payment ID and the email you used at checkout.">
      <OrderStatusView initialId={id.toUpperCase()} />
    </CheckoutShell>
  );
}

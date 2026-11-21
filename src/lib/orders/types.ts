import type { AssetId, NetworkId } from "@/config/payments";
import type { EditionId, PlatformId } from "@/config/types";

/** Order lifecycle. Only an administrator moves an order past "payment_submitted". */
export type OrderStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "under_review"
  | "info_required"
  | "payment_verified"
  | "game_ready"
  | "payment_rejected"
  | "order_expired";

/**
 * Allowed transitions (to be enforced server-side by the admin API).
 * Customer: awaiting_payment -> payment_submitted (and info_required -> payment_submitted).
 * System: awaiting_payment -> order_expired after the quote window. Never -> verified.
 * Admin: everything else, after checking network, asset, recipient, amount,
 * confirmations and that the TXID is not used by another order.
 */
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["payment_submitted", "order_expired"],
  payment_submitted: ["under_review", "payment_rejected"],
  under_review: ["payment_verified", "info_required", "payment_rejected"],
  info_required: ["payment_submitted", "payment_rejected"],
  payment_verified: ["game_ready"],
  game_ready: [],
  payment_rejected: [],
  order_expired: [],
};

export type Quote = {
  asset: AssetId;
  network: NetworkId;
  /** Exact amount to send, as a decimal string. */
  amount: string;
  usdCents: number;
  rate: number;
  /** True when the rate is a preview figure, not a live quote. */
  preview: boolean;
  expiresAt: string;
};

/**
 * Order as the browser sees it (built server-side). The internal UUID is never sent.
 * Sensitive fields appear only with the order's access key: email, address, txid,
 * and fulfillment (only once the order is game_ready).
 */
export type Order = {
  paymentId: string;
  /** Short order reference, e.g. ORD-7KQ2M9. */
  reference: string;
  edition: EditionId;
  platform: PlatformId;
  quote: Quote;
  status: OrderStatus;
  createdAt: string;
  submittedAt?: string;
  customerNote?: string;
  history: { status: OrderStatus; at: string }[];
  /** True for test orders (sample addresses, preview rates, no real fulfillment). */
  test: boolean;
  /** True when the caller proved the access key; unlocks the fields below. */
  authorized: boolean;
  email?: string;
  address?: string;
  txid?: string;
  claimedAmount?: string;
  fulfillment?: { kind: "redemption_code" | "access_link"; code: string; test: boolean };
};

export const statusInfo: Record<OrderStatus, { label: string; detail: string; tone: "wait" | "action" | "good" | "bad" }> = {
  awaiting_payment: { label: "Awaiting payment", detail: "Send the exact amount, then submit your transaction hash.", tone: "action" },
  payment_submitted: { label: "Payment submitted", detail: "We have your transaction details. Manual review starts shortly.", tone: "wait" },
  under_review: { label: "Under manual review", detail: "We are checking the transaction on the blockchain.", tone: "wait" },
  info_required: { label: "Additional information required", detail: "We need something from you before we can continue.", tone: "action" },
  payment_verified: { label: "Payment verified", detail: "Your payment is confirmed. We are preparing your game.", tone: "good" },
  game_ready: { label: "Game ready", detail: "Your game is ready to redeem.", tone: "good" },
  payment_rejected: { label: "Payment rejected", detail: "We could not verify this payment.", tone: "bad" },
  order_expired: { label: "Order expired", detail: "No payment was submitted before the quote expired.", tone: "bad" },
};

/** The happy path, used for the status timeline. */
export const timeline: OrderStatus[] = ["awaiting_payment", "payment_submitted", "under_review", "payment_verified", "game_ready"];

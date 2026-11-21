"use client";

import type { AssetId, NetworkId } from "@/config/payments";
import type { EditionId, PlatformId } from "@/config/types";
import type { Order } from "./types";

/**
 * Client for the order API. The server decides prices, amounts, addresses and Payment IDs;
 * the browser only sends choices. Each order's access key (returned once at creation) is
 * kept in this browser so the customer can return to the payment page and see protected
 * details. Without it, Payment ID + email shows progress only.
 */

export type CreateOrderInput = { edition: EditionId; platform: PlatformId; email: string; region: string; asset: AssetId; network: NetworkId };

const KEYS = "vice-order-keys";

function keys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEYS) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function accessKeyFor(paymentId: string): string | undefined {
  return keys()[paymentId.trim().toUpperCase()];
}

export function rememberAccessKey(paymentId: string, key: string) {
  try {
    localStorage.setItem(KEYS, JSON.stringify({ ...keys(), [paymentId]: key }));
  } catch {
    // Storage unavailable: the customer can still use the access link shown after payment.
  }
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export const orderStore = {
  async create(input: CreateOrderInput): Promise<Order> {
    const { order, accessKey } = await call<{ order: Order; accessKey: string }>("/api/orders", input);
    rememberAccessKey(order.paymentId, accessKey);
    return order;
  },
  /** Full view; null when this browser has no access key for the order. */
  async get(paymentId: string, key = accessKeyFor(paymentId)): Promise<Order | null> {
    if (!key) return null;
    try {
      return (await call<{ order: Order }>("/api/orders/view", { paymentId, key })).order;
    } catch {
      return null;
    }
  },
  async lookup(paymentId: string, email: string, key = accessKeyFor(paymentId)): Promise<Order> {
    return (await call<{ order: Order }>("/api/orders/status", { paymentId, email, key })).order;
  },
  /** Multipart proof submission; adds the access key stored in this browser. */
  async submitPayment(form: FormData): Promise<Order> {
    const key = accessKeyFor(String(form.get("paymentId") ?? ""));
    if (key) form.set("key", key);
    const res = await fetch("/api/orders/submit", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { order?: Order; error?: string };
    if (!res.ok || !data.order) throw new Error(data.error ?? "Something went wrong. Please try again.");
    return data.order;
  },
};
